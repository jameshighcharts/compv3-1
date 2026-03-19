import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock, readFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: Object.assign(execFileMock, {
    [Symbol.for("nodejs.util.promisify.custom")]: (
      command: string,
      args: string[],
      options: object,
    ) =>
      new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        execFileMock(
          command,
          args,
          options,
          (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
              reject(error);
              return;
            }

            resolve({ stdout, stderr });
          },
        );
      }),
  }),
}));

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

vi.mock("node:os", () => ({
  homedir: () => "/Users/tester",
}));

const makeExecError = (message: string): Error =>
  Object.assign(new Error(message), {
    stdout: "",
    stderr: "",
  });

const respondToExec = (
  error: Error | null,
  stdout = "",
  stderr = "",
): void => {
  execFileMock.mockImplementationOnce(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: (execError: Error | null, execStdout: string, execStderr: string) => void,
    ) => {
      callback(error, stdout, stderr);
      return {};
    },
  );
};

describe("querySalesforce auth resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    execFileMock.mockReset();
    readFileMock.mockReset();
    readFileMock.mockImplementation(async () => {
      const missing = new Error("ENOENT") as Error & { code?: string };
      missing.code = "ENOENT";
      throw missing;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("falls back to sfdx when sf org display fails", async () => {
    vi.stubEnv("SF_TARGET_ORG", "compass-dev");
    vi.stubEnv("HOME", "/Users/tester");
    vi.stubEnv("SF_API_VERSION", "v66.0");

    respondToExec(makeExecError("sf org display failed"));
    respondToExec(
      null,
      JSON.stringify({
        status: 0,
        result: {
          accessToken: "sfdx-token",
          instanceUrl: "https://example.my.salesforce.com",
          apiVersion: "66.0",
        },
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ records: [], done: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { querySalesforce } = await import("./client");

    await expect(
      querySalesforce("SELECT Id FROM Account LIMIT 1"),
    ).resolves.toEqual([]);

    expect(execFileMock).toHaveBeenCalledTimes(2);
    expect(execFileMock.mock.calls[0]?.[0]).toBe("sf");
    expect(execFileMock.mock.calls[0]?.[1]).toEqual([
      "org",
      "display",
      "--json",
      "--verbose",
      "--target-org",
      "compass-dev",
    ]);
    expect(execFileMock.mock.calls[1]?.[0]).toBe("sfdx");
    expect(execFileMock.mock.calls[1]?.[1]).toEqual([
      "force:org:display",
      "--json",
      "--targetusername",
      "compass-dev",
    ]);
    expect(execFileMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        env: expect.not.objectContaining({
          SF_API_VERSION: expect.anything(),
          SF_ORG_API_VERSION: expect.anything(),
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/services/data/v66.0/query?q="),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sfdx-token",
        }),
      }),
    );
  });

  it("falls back to cached auth files resolved from org aliases", async () => {
    vi.stubEnv("SF_TARGET_ORG", "compass-dev");
    vi.stubEnv("HOME", "/Users/tester");

    respondToExec(makeExecError("sf org display failed"));
    respondToExec(makeExecError("sfdx force:org:display failed"));

    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === "/Users/tester/.sfdx/alias.json") {
        return JSON.stringify({
          orgs: {
            "compass-dev": "user@example.com",
          },
        });
      }

      if (filePath === "/Users/tester/.sfdx/user@example.com.json") {
        return JSON.stringify({
          accessToken: "bad-file-token",
          instanceUrl: "https://file.example.salesforce.com",
          instanceApiVersion: "65.0",
          refreshToken: "refresh-token",
          loginUrl: "https://login.salesforce.com",
          clientId: "PlatformCLI",
        });
      }

      const missing = new Error(`ENOENT: ${filePath}`) as Error & { code?: string };
      missing.code = "ENOENT";
      throw missing;
    });

    const fetchMock = vi.fn().mockImplementation(
      async (input: string | URL) => {
        const url = String(input);

        if (url === "https://login.salesforce.com/services/oauth2/token") {
          return new Response(
            JSON.stringify({
              access_token: "fresh-token",
              instance_url: "https://file.example.salesforce.com",
              token_type: "Bearer",
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        return new Response(JSON.stringify({ records: [], done: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const { querySalesforce } = await import("./client");

    await expect(
      querySalesforce("SELECT Id FROM Opportunity LIMIT 1"),
    ).resolves.toEqual([]);

    expect(execFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenCalledWith(
      "/Users/tester/.sf/alias.json",
      "utf8",
    );
    expect(readFileMock).toHaveBeenCalledWith(
      "/Users/tester/.sfdx/alias.json",
      "utf8",
    );
    expect(readFileMock).toHaveBeenCalledWith(
      "/Users/tester/.sfdx/user@example.com.json",
      "utf8",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://login.salesforce.com/services/oauth2/token",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/services/data/v65.0/query?q="),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-token",
        }),
      }),
    );
  });

  it("falls back to the CLI default org when SF_TARGET_ORG is mistyped", async () => {
    vi.stubEnv("SF_TARGET_ORG", "compass-cev");
    vi.stubEnv("HOME", "/Users/tester");
    vi.stubEnv("SF_API_VERSION", "v66.0");

    respondToExec(makeExecError("sf org display failed for compass-cev"));
    respondToExec(makeExecError("sfdx force:org:display failed for compass-cev"));
    respondToExec(
      null,
      JSON.stringify({
        status: 0,
        result: {
          accessToken: "fallback-token",
          instanceUrl: "https://example.my.salesforce.com",
          apiVersion: "66.0",
        },
      }),
    );

    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === "/Users/tester/.sf/config.json") {
        return JSON.stringify({
          "target-org": "compass-dev",
        });
      }

      const missing = new Error(`ENOENT: ${filePath}`) as Error & { code?: string };
      missing.code = "ENOENT";
      throw missing;
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ records: [], done: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { querySalesforce } = await import("./client");

    await expect(
      querySalesforce("SELECT Id FROM Account LIMIT 1"),
    ).resolves.toEqual([]);

    expect(execFileMock).toHaveBeenCalledTimes(3);
    expect(execFileMock.mock.calls[0]?.[1]).toEqual([
      "org",
      "display",
      "--json",
      "--verbose",
      "--target-org",
      "compass-cev",
    ]);
    expect(execFileMock.mock.calls[1]?.[1]).toEqual([
      "force:org:display",
      "--json",
      "--targetusername",
      "compass-cev",
    ]);
    expect(execFileMock.mock.calls[2]?.[1]).toEqual([
      "org",
      "display",
      "--json",
      "--verbose",
      "--target-org",
      "compass-dev",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/services/data/v66.0/query?q="),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fallback-token",
        }),
      }),
    );
  });
});
