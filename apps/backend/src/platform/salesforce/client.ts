import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SF_PATH = `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`;
const DEFAULT_API_VERSION = process.env.SF_API_VERSION?.trim() || "v66.0";
const AUTH_CACHE_TTL_MS = 10 * 60 * 1000;
const PLACEHOLDER_PREFIXES = ["replace-with-", "<your-", "<replace-"] as const;

type SalesforceAuth = {
  accessToken: string;
  instanceUrl: string;
  apiVersion: string;
};

type CachedAuth = {
  value: SalesforceAuth;
  expiresAt: number;
};

type SalesforceCliPayload = {
  result?: {
    accessToken?: string;
    instanceUrl?: string;
    apiVersion?: string;
  };
  message?: string;
  status?: number;
};

type SalesforceAliasFile = {
  orgs?: Record<string, string>;
  [key: string]: unknown;
};

type SalesforceConfigFile = {
  "target-org"?: string;
  defaultusername?: string;
};

type SalesforceAuthFile = {
  accessToken?: string;
  instanceUrl?: string;
  apiVersion?: string;
  instanceApiVersion?: string;
  refreshToken?: string;
  loginUrl?: string;
  clientId?: string;
  orgId?: string;
};

class SalesforceApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SalesforceApiError";
    this.status = status;
  }
}

let authCache: CachedAuth | null = null;
let authInFlight: Promise<SalesforceAuth> | null = null;

const normalizeApiVersion = (value: string): string =>
  value.startsWith("v") ? value : `v${value}`;

const stripAnsi = (value: string): string =>
  value.replace(/\u001B\[[0-9;]*m/g, "");

const readOptionalEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();

  if (
    PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
    normalized === "changeme" ||
    normalized === "your-value-here"
  ) {
    return null;
  }

  return trimmed;
};

const getSalesforceHome = (): string => process.env.HOME?.trim() || homedir();

const getCliEnv = (): NodeJS.ProcessEnv => {
  const cliEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: SF_PATH,
  };

  delete cliEnv.SF_API_VERSION;
  delete cliEnv.SF_ORG_API_VERSION;

  return cliEnv;
};

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
};

const readTextResponse = async (response: Response): Promise<string> => {
  try {
    return await response.text();
  } catch {
    return "";
  }
};

const parseCliAuthPayload = (
  stdout: string,
  sourceLabel: string,
): SalesforceAuth => {
  let payload: SalesforceCliPayload;

  try {
    payload = JSON.parse(stdout) as SalesforceCliPayload;
  } catch {
    throw new Error(`${sourceLabel} did not return valid JSON.`);
  }

  if (payload.status && payload.status !== 0) {
    throw new Error(payload.message ?? `Unable to resolve Salesforce auth via ${sourceLabel}.`);
  }

  const accessToken = payload.result?.accessToken?.trim();
  const instanceUrl = payload.result?.instanceUrl?.trim();
  const apiVersion = payload.result?.apiVersion?.trim();

  if (!accessToken || !instanceUrl) {
    throw new Error(`${sourceLabel} did not return an access token and instance URL.`);
  }

  return {
    accessToken,
    instanceUrl,
    apiVersion: normalizeApiVersion(apiVersion || DEFAULT_API_VERSION),
  };
};

const describeCliFailure = (sourceLabel: string, error: unknown): string => {
  if (!(error instanceof Error)) {
    return `${sourceLabel}: unknown failure.`;
  }

  const detail = [
    error.message,
    "stderr" in error ? String(error.stderr ?? "") : "",
    "stdout" in error ? String(error.stdout ?? "") : "",
  ]
    .map((value) => stripAnsi(value).trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `${sourceLabel}: ${detail || "command failed."}`;
};

const refreshAuthFromLocalFile = async (
  auth: SalesforceAuthFile,
): Promise<SalesforceAuth | null> => {
  const refreshToken = auth.refreshToken?.trim();
  const loginUrl = auth.loginUrl?.trim();
  const clientId = auth.clientId?.trim();

  if (!refreshToken || !loginUrl || !clientId) {
    return null;
  }

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await readTextResponse(response);
    const detail = body ? ` ${body.slice(0, 240)}` : "";
    console.warn(
      `Salesforce auth refresh from local file failed with status ${response.status}.${detail}`,
    );
    return null;
  }

  const payload = (await parseJson<{
    access_token?: string;
    instance_url?: string;
    token_type?: string;
  }>(response)) ?? { access_token: undefined, instance_url: undefined, token_type: undefined };

  const accessToken = payload.access_token?.trim();
  const instanceUrl = payload.instance_url?.trim() ?? auth.instanceUrl?.trim();
  const apiVersion =
    auth.apiVersion?.trim() ??
    auth.instanceApiVersion?.trim() ??
    DEFAULT_API_VERSION;

  if (!accessToken || !instanceUrl) {
    return null;
  }

  return {
    accessToken,
    instanceUrl,
    apiVersion: normalizeApiVersion(apiVersion),
  };
};

const readTargetOrgFromCliConfig = async (): Promise<string | null> => {
  const salesforceHome = getSalesforceHome();
  const configFiles = [
    path.join(salesforceHome, ".sf", "config.json"),
    path.join(salesforceHome, ".sfdx", "sfdx-config.json"),
  ];

  for (const filePath of configFiles) {
    const config = await readJsonFile<SalesforceConfigFile>(filePath);
    const targetOrg =
      readOptionalEnv(config?.["target-org"]) ??
      readOptionalEnv(config?.defaultusername);

    if (targetOrg) {
      return targetOrg;
    }
  }

  return null;
};

const resolveAliasUsername = async (targetOrg: string): Promise<string> => {
  const salesforceHome = getSalesforceHome();
  const aliasFiles = [
    path.join(salesforceHome, ".sf", "alias.json"),
    path.join(salesforceHome, ".sfdx", "alias.json"),
  ];

  for (const filePath of aliasFiles) {
    const payload = await readJsonFile<SalesforceAliasFile>(filePath);
    const orgAlias =
      readOptionalEnv(payload?.orgs?.[targetOrg]) ??
      readOptionalEnv(typeof payload?.[targetOrg] === "string" ? payload[targetOrg] : undefined);

    if (orgAlias) {
      return orgAlias;
    }
  }

  return targetOrg;
};

const readAuthFromLocalFiles = async (
  targetOrg: string | null,
): Promise<SalesforceAuth | null> => {
  if (!targetOrg) {
    return null;
  }

  const salesforceHome = getSalesforceHome();
  const resolvedUsername = await resolveAliasUsername(targetOrg);
  const authFiles = [
    path.join(salesforceHome, ".sfdx", `${resolvedUsername}.json`),
  ];

  for (const filePath of authFiles) {
    const auth = await readJsonFile<SalesforceAuthFile>(filePath);
    if (!auth) {
      continue;
    }

    const refreshedAuth = await refreshAuthFromLocalFile(auth);

    if (refreshedAuth) {
      return refreshedAuth;
    }
  }

  return null;
};

const runCliAuthCommand = async (
  command: string,
  args: string[],
  sourceLabel: string,
): Promise<SalesforceAuth> => {
  const { stdout, stderr } = await execFileAsync(command, args, {
    env: getCliEnv(),
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  return parseCliAuthPayload(stdout, sourceLabel);
};

const getEnvAuth = (): SalesforceAuth | null => {
  const accessToken = readOptionalEnv(process.env.SF_ACCESS_TOKEN);
  const instanceUrl = readOptionalEnv(process.env.SF_INSTANCE_URL);

  if (!accessToken || !instanceUrl) {
    return null;
  }

  return {
    accessToken,
    instanceUrl,
    apiVersion: normalizeApiVersion(DEFAULT_API_VERSION),
  };
};

const pushUniqueTargetOrg = (
  candidates: Array<string | null>,
  targetOrg: string | null,
): void => {
  if (targetOrg === null) {
    if (!candidates.includes(null)) {
      candidates.push(null);
    }
    return;
  }

  if (!candidates.includes(targetOrg)) {
    candidates.push(targetOrg);
  }
};

const resolveTargetOrgCandidates = async (): Promise<Array<string | null>> => {
  const explicitTargetOrg = readOptionalEnv(process.env.SF_TARGET_ORG);
  const cliConfigTargetOrg = await readTargetOrgFromCliConfig();
  const candidates: Array<string | null> = [];

  pushUniqueTargetOrg(candidates, explicitTargetOrg);
  pushUniqueTargetOrg(candidates, cliConfigTargetOrg);

  if (candidates.length === 0) {
    candidates.push(null);
  }

  return candidates;
};

const readAuthFromSfCli = async (): Promise<SalesforceAuth> => {
  const requestedTargetOrg = readOptionalEnv(process.env.SF_TARGET_ORG);
  const aliasHint = requestedTargetOrg ? ` for target org "${requestedTargetOrg}"` : "";
  const attempts: string[] = [];
  const targetOrgCandidates = await resolveTargetOrgCandidates();

  for (const targetOrg of targetOrgCandidates) {
    const sfArgs = ["org", "display", "--json", "--verbose"];

    if (targetOrg) {
      sfArgs.push("--target-org", targetOrg);
    }

    try {
      return await runCliAuthCommand("sf", sfArgs, "sf org display");
    } catch (error) {
      attempts.push(describeCliFailure("sf org display", error));
    }

    const sfdxArgs = ["force:org:display", "--json"];

    if (targetOrg) {
      sfdxArgs.push("--targetusername", targetOrg);
    }

    try {
      return await runCliAuthCommand(
        "sfdx",
        sfdxArgs,
        "sfdx force:org:display",
      );
    } catch (error) {
      attempts.push(describeCliFailure("sfdx force:org:display", error));
    }

    const fileAuth = await readAuthFromLocalFiles(targetOrg);

    if (fileAuth) {
      return fileAuth;
    }
  }

  const attemptsSummary = attempts.length ? ` Attempts: ${attempts.join(" | ")}` : "";
  throw new Error(
    `Failed to load Salesforce auth${aliasHint}. Set a real SF_TARGET_ORG, or use SF_ACCESS_TOKEN and SF_INSTANCE_URL directly.${attemptsSummary}`,
  );
};

const getAuth = async (forceRefresh = false): Promise<SalesforceAuth> => {
  const envAuth = getEnvAuth();

  if (envAuth) {
    return envAuth;
  }

  if (!forceRefresh && authCache && authCache.expiresAt > Date.now()) {
    return authCache.value;
  }

  if (!forceRefresh && authInFlight) {
    return authInFlight;
  }

  authInFlight = readAuthFromSfCli()
    .then((auth) => {
      authCache = {
        value: auth,
        expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      };

      return auth;
    })
    .finally(() => {
      authInFlight = null;
    });

  return authInFlight;
};

const invalidateAuthCache = (): void => {
  authCache = null;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new SalesforceApiError("Salesforce returned non-JSON response.", response.status);
  }
};

const queryPage = async <T>(
  auth: SalesforceAuth,
  query: string,
  nextRecordsUrl?: string,
): Promise<{ records: T[]; done: boolean; nextRecordsUrl?: string }> => {
  const url = nextRecordsUrl
    ? new URL(nextRecordsUrl, auth.instanceUrl).toString()
    : `${auth.instanceUrl}/services/data/${auth.apiVersion}/query?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SalesforceApiError(
      `Salesforce query failed with status ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`,
      response.status,
    );
  }

  const payload = await parseJson<{
    records?: T[];
    done?: boolean;
    nextRecordsUrl?: string;
  }>(response);

  return {
    records: payload.records ?? [],
    done: payload.done ?? true,
    nextRecordsUrl: payload.nextRecordsUrl,
  };
};

const queryAllWithAuth = async <T>(auth: SalesforceAuth, query: string): Promise<T[]> => {
  const records: T[] = [];
  let nextRecordsUrl: string | undefined;

  do {
    const page = await queryPage<T>(auth, query, nextRecordsUrl);
    records.push(...page.records);
    nextRecordsUrl = page.done ? undefined : page.nextRecordsUrl;
  } while (nextRecordsUrl);

  return records;
};

export const querySalesforce = async <T>(query: string): Promise<T[]> => {
  const auth = await getAuth(false);

  try {
    return await queryAllWithAuth<T>(auth, query);
  } catch (error) {
    if (error instanceof SalesforceApiError && error.status === 401) {
      invalidateAuthCache();
      const refreshedAuth = await getAuth(true);
      return queryAllWithAuth<T>(refreshedAuth, query);
    }

    throw error;
  }
};
