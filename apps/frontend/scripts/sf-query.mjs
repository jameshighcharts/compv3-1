import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const usage = `Usage:
  npm run sf:query -- --query "SELECT Id, Name FROM Account LIMIT 10"
  npm run sf:query -- --query "SELECT Id FROM ApexClass LIMIT 5" --tooling
  npm run sf:query -- --query "SELECT Id, Name FROM Opportunity LIMIT 50" --output ./tmp/opps.json

Options:
  -q, --query       Required. SOQL query to run.
  -o, --target-org  Optional. Salesforce org alias or username. Defaults to SF_TARGET_ORG env var.
  --tooling         Optional. Use the Tooling API.
  --output          Optional. Write results JSON to a file.
  -h, --help        Show this help message.
`;

const parseArgs = (argv) => {
  let query = "";
  let targetOrg = process.env.SF_TARGET_ORG?.trim() || undefined;
  let outputPath;
  let useToolingApi = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "-h":
      case "--help":
        console.info(usage);
        process.exit(0);
      case "-q":
      case "--query": {
        const next = argv[index + 1];
        if (!next) {
          throw new Error("Missing value for --query.");
        }
        query = next;
        index += 1;
        break;
      }
      case "-o":
      case "--target-org": {
        const next = argv[index + 1];
        if (!next) {
          throw new Error("Missing value for --target-org.");
        }
        targetOrg = next;
        index += 1;
        break;
      }
      case "--output": {
        const next = argv[index + 1];
        if (!next) {
          throw new Error("Missing value for --output.");
        }
        outputPath = next;
        index += 1;
        break;
      }
      case "--tooling":
        useToolingApi = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!query) {
    throw new Error("Missing required --query argument.");
  }

  return {
    query,
    targetOrg,
    outputPath,
    useToolingApi,
  };
};

const run = async () => {
  const { query, targetOrg, outputPath, useToolingApi } = parseArgs(process.argv.slice(2));

  const sfArgs = ["data", "query", "--json", "--query", query];

  if (targetOrg) {
    sfArgs.push("--target-org", targetOrg);
  }

  if (useToolingApi) {
    sfArgs.push("--use-tooling-api");
  }

  let stdout;
  let stderr;

  try {
    ({ stdout, stderr } = await execFileAsync("sf", sfArgs, {
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
      },
    }));
  } catch (error) {
    if (error instanceof Error) {
      const sfStdout = "stdout" in error ? String(error.stdout ?? "") : "";
      const sfStderr = "stderr" in error ? String(error.stderr ?? "") : "";

      let detail = sfStderr.trim();
      if (!detail && sfStdout.trim()) {
        try {
          const parsed = JSON.parse(sfStdout);
          detail = parsed.message ?? sfStdout.trim();
        } catch {
          detail = sfStdout.trim();
        }
      }

      throw new Error(
        [
          "Failed to execute Salesforce CLI command. Ensure `sf` is installed and authenticated.",
          detail,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    throw error;
  }

  if (stderr.trim()) {
    console.error(stderr.trim());
  }

  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error("Salesforce CLI did not return valid JSON.");
  }

  if (payload.status && payload.status !== 0) {
    throw new Error(payload.message ?? "Salesforce query failed.");
  }

  const output = {
    query,
    targetOrg: targetOrg ?? null,
    totalSize: payload.result?.totalSize ?? null,
    done: payload.result?.done ?? null,
    records: payload.result?.records ?? [],
    fetchedAt: new Date().toISOString(),
  };

  const outputJson = JSON.stringify(output, null, 2);

  if (outputPath) {
    const absolutePath = resolve(outputPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${outputJson}\n`, "utf8");
    console.info(`Wrote query result to ${absolutePath}`);
    return;
  }

  console.info(outputJson);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
