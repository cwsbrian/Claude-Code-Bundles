import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runCli(
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");
    const cliPath = path.join(repoRoot, "src", "cli", "index.ts");
    const child = spawn(tsxBin, [cliPath, ...args], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) =>
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }),
    );
  });
}

describe("apply/lint e2e", () => {
  it("runs create -> manifest validate -> pack -> lint -> apply -> list on isolated HOME", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ccb-e2e-"));
    const homeDir = path.join(tempRoot, "home");
    const workDir = path.join(tempRoot, "workspace");
    await mkdir(homeDir, { recursive: true });
    await mkdir(path.join(workDir, "payload", "skills"), { recursive: true });
    await writeFile(path.join(workDir, "payload", "skills", "demo.md"), "demo", "utf8");

    const env = {
      ...process.env,
      HOME: homeDir,
      BUNDLE_CLI_NONINTERACTIVE: "1",
      BUNDLE_CLI_NAME: "E2E Bundle",
      BUNDLE_CLI_VISIBILITY: "private",
      BUNDLE_CLI_ITEMS: "1",
    };

    const createRes = await runCli(["create"], workDir, env);
    expect(createRes.code).toBe(0);

    const validateRes = await runCli(
      ["manifest", "validate", "bundle.json"],
      workDir,
      env,
    );
    expect(validateRes.code).toBe(0);

    const packRes = await runCli(
      ["pack", "--manifest", "bundle.json", "--out", "bundle.zip"],
      workDir,
      env,
    );
    expect(packRes.code).toBe(0);

    const lintRes = await runCli(
      ["lint", "--archive", "bundle.zip", "--manifest", "bundle.json"],
      workDir,
      env,
    );
    expect(lintRes.code).toBe(0);

    const applyRes = await runCli(["apply", "--manifest", "bundle.json", "--force"], workDir, env);
    expect(applyRes.code).toBe(0);

    const listRes = await runCli(["list"], workDir, env);
    expect(listRes.code).toBe(0);
    expect(listRes.stdout).toContain("e2e-bundle");

    const installedManifest = await readFile(
      path.join(homeDir, ".claude", "bundles", "e2e-bundle", "bundle.json"),
      "utf8",
    );
    expect(installedManifest).toContain("\"bundle_id\": \"e2e-bundle\"");
  });

  it("blocks public fixture and warns private fixture for secret samples", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ccb-e2e-lint-"));
    const env = { ...process.env, HOME: tempRoot };
    const fixtureRoot = path.resolve("tests/fixtures/secret-samples");

    const privatePack = await runCli(
      [
        "pack",
        "--manifest",
        path.join(fixtureRoot, "private-with-secret", "bundle.json"),
        "--out",
        path.join(tempRoot, "private.zip"),
      ],
      path.resolve("."),
      env,
    );
    expect(privatePack.code).toBe(0);

    const privateLint = await runCli(
      [
        "lint",
        "--archive",
        path.join(tempRoot, "private.zip"),
        "--manifest",
        path.join(fixtureRoot, "private-with-secret", "bundle.json"),
      ],
      path.resolve("."),
      env,
    );
    expect(privateLint.code).toBe(0);

    const publicPack = await runCli(
      [
        "pack",
        "--manifest",
        path.join(fixtureRoot, "public-with-secret", "bundle.json"),
        "--out",
        path.join(tempRoot, "public.zip"),
      ],
      path.resolve("."),
      env,
    );
    expect(publicPack.code).toBe(0);

    const publicLint = await runCli(
      [
        "lint",
        "--archive",
        path.join(tempRoot, "public.zip"),
        "--manifest",
        path.join(fixtureRoot, "public-with-secret", "bundle.json"),
      ],
      path.resolve("."),
      env,
    );
    expect(publicLint.code).toBe(1);
    expect(publicLint.stderr).toContain("Lint failed");
  });
});
