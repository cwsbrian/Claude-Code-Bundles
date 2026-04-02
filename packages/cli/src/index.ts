#!/usr/bin/env node
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import {
  applyBundle,
  createWizard,
  lintArchive,
  listRegistry,
  loadManifest,
  pack,
  unpack,
  updateRegistry,
  validateManifestFile,
} from "@claude-code-bundles/core";

type ParsedPackArgs = { manifestPath: string; outArchivePath: string };
type ParsedUnpackArgs = { archivePath: string; outDir: string };
type ParsedApplyArgs = { manifestPath: string; force: boolean };
type ParsedInstallArgs = { archivePath: string; force: boolean };
type ParsedLintArgs = { archivePath: string; manifestPath: string };

function getArgValue(args: string[], ...flags: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) {
      return args[i + 1];
    }
  }
  return undefined;
}

function parsePackArgs(args: string[]): ParsedPackArgs {
  const manifestPath = getArgValue(args, "--manifest", "-m");
  const outArchivePath = getArgValue(args, "--out", "-o");

  if (!manifestPath) {
    throw new Error(
      "Missing --manifest for pack. Run create first or pass --manifest <path>.",
    );
  }

  if (!outArchivePath) {
    throw new Error("Missing --out for pack.");
  }

  return { manifestPath, outArchivePath };
}

function parseUnpackArgs(args: string[]): ParsedUnpackArgs {
  const archivePath = getArgValue(args, "--archive", "-a");
  const outDir = getArgValue(args, "--out", "-o");

  if (!archivePath) {
    throw new Error("Missing --archive for unpack.");
  }
  if (!outDir) {
    throw new Error("Missing --out for unpack.");
  }

  return { archivePath, outDir };
}

function parseApplyArgs(args: string[]): ParsedApplyArgs {
  const manifestPath = getArgValue(args, "--manifest", "-m");
  if (!manifestPath) {
    throw new Error("Missing --manifest for apply.");
  }
  return { manifestPath, force: args.includes("--force") };
}

function parseInstallArgs(args: string[]): ParsedInstallArgs {
  const archivePath = getArgValue(args, "--archive", "-a");
  if (!archivePath) {
    throw new Error("Missing --archive for install.");
  }
  return { archivePath, force: args.includes("--force") };
}

function parseLintArgs(args: string[]): ParsedLintArgs {
  const archivePath = getArgValue(args, "--archive", "-a");
  const manifestPath = getArgValue(args, "--manifest", "-m");
  if (!archivePath) {
    throw new Error("Missing --archive for lint.");
  }
  if (!manifestPath) {
    throw new Error("Missing --manifest for lint.");
  }
  return { archivePath, manifestPath };
}

function printUsage(): void {
  console.error(
    [
      "Usage:",
      "  ccb login [--supabase-url] [--supabase-anon-key] [--api-url]",
      "  ccb logout",
      "  ccb create",
      "  ccb pack --manifest <path> --out <archive>",
      "  ccb unpack --archive <path> --out <dir>",
      "  ccb apply --manifest <path> [--force]",
      "  ccb install --archive <path> [--force]",
      "  ccb list",
      "  ccb lint --archive <path> --manifest <manifest>",
      "  ccb manifest validate <file>",
      "  ccb remote upload --archive <zip> [--manifest] [--api-url] [--token]",
      "  ccb remote list [--api-url] [--token]",
      "  ccb remote download --bundle <uuid> --snapshot <uuid> --out <file.zip> [--api-url] [--token]",
      "  ccb pull [--api-url] [--token]",
      "  ccb status [--api-url] [--token]",
      "  ccb publish <bundleId> [--api-url] [--token]",
      "  ccb unpublish <bundleId> [--api-url] [--token]",
      "  ccb import <owner/bundleId> [--api-url] [--token]",
      "  ccb delete <bundleId> [--api-url] [--token]",
      "  ccb setup [--force]",
    ].join("\n"),
  );
}

export async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "login") {
    const login = await import("./login.js");
    const supabaseUrl =
      getArgValue(args, "--supabase-url") ??
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      getArgValue(args, "--supabase-anon-key") ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiUrl =
      getArgValue(args, "--api-url") ??
      process.env.CCB_API_URL ??
      process.env.NEXT_PUBLIC_SITE_URL;
    if (!supabaseUrl) throw new Error("Set --supabase-url or SUPABASE_URL env var.");
    if (!supabaseAnonKey) throw new Error("Set --supabase-anon-key or SUPABASE_ANON_KEY env var.");
    if (!apiUrl) throw new Error("Set --api-url or CCB_API_URL env var.");
    await login.runLogin({ supabaseUrl, supabaseAnonKey, apiUrl });
    return;
  }

  if (command === "logout") {
    const { clearAuth } = await import("./auth-store.js");
    await clearAuth();
    process.stdout.write("Logged out.\n");
    return;
  }

  if (command === "remote") {
    const sub = args[0];
    const rest = args.slice(1);
    const remote = await import("./remote.js");
    if (sub === "upload") {
      await remote.runRemoteUploadCli(rest);
      return;
    }
    if (sub === "list") {
      await remote.runRemoteListCli(rest);
      return;
    }
    if (sub === "download") {
      await remote.runRemoteDownloadCli(rest);
      return;
    }
    throw new Error(`Unknown remote subcommand: ${sub ?? "(none)"}`);
  }

  if (command === "create") {
    const outPath = await createWizard({
      cwd: process.cwd(),
      stdin: process.stdin,
      stdout: process.stdout,
      env: process.env,
    });
    process.stdout.write(`Created ${outPath}\n`);
    return;
  }

  if (command === "manifest" && args[0] === "validate") {
    const filePath = args[1];
    if (!filePath) {
      throw new Error("Missing file path: ccb manifest validate <file>");
    }
    const result = await validateManifestFile(filePath);
    if (!result.valid) {
      for (const issue of result.issues) {
        process.stderr.write(`${issue.path}: ${issue.message}\n`);
      }
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Manifest valid: ${filePath}\n`);
    return;
  }

  if (command === "pack") {
    const parsed = parsePackArgs(args);
    await access(parsed.manifestPath);
    const check = await validateManifestFile(parsed.manifestPath);
    if (!check.valid) {
      throw new Error(check.issues.map((issue) => issue.message).join("; "));
    }
    await pack({
      manifestPath: parsed.manifestPath,
      outArchivePath: parsed.outArchivePath,
    });
    return;
  }

  if (command === "unpack") {
    const parsed = parseUnpackArgs(args);
    await unpack({ archivePath: parsed.archivePath, outDir: parsed.outDir });
    return;
  }

  if (command === "apply") {
    const parsed = parseApplyArgs(args);
    const manifest = await loadManifest(parsed.manifestPath);
    const result = await applyBundle({
      manifestPath: parsed.manifestPath,
      manifest,
      force: parsed.force,
    });
    await updateRegistry({
      bundleId: manifest.bundle_id,
      snapshotId: `${manifest.bundle_id}@${manifest.version}`,
      archivePath: "",
      manifestSourcePath: path.resolve(parsed.manifestPath),
      installedPaths: result.installedPaths,
    });
    process.stdout.write(`Applied ${result.bundleId} to ${result.claudeRoot}\n`);
    return;
  }

  if (command === "install") {
    const parsed = parseInstallArgs(args);
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ccb-install-"));
    await unpack({ archivePath: parsed.archivePath, outDir: tempRoot });
    const manifestPath = path.join(tempRoot, "bundle.json");
    const manifest = await loadManifest(manifestPath);
    const applyResult = await applyBundle({
      manifestPath,
      manifest,
      force: parsed.force,
    });
    await updateRegistry({
      bundleId: manifest.bundle_id,
      snapshotId: `${manifest.bundle_id}@${manifest.version}`,
      archivePath: path.resolve(parsed.archivePath),
      manifestSourcePath: manifestPath,
      installedPaths: applyResult.installedPaths,
    });
    process.stdout.write(
      `Installed ${manifest.bundle_id} from ${path.resolve(parsed.archivePath)}\n`,
    );
    return;
  }

  if (command === "list") {
    const entries = await listRegistry();
    if (entries.length === 0) {
      process.stdout.write("No bundles installed.\n");
      return;
    }
    for (const entry of entries) {
      process.stdout.write(
        `${entry.bundleId}\tsnapshot=${entry.snapshotId}\tarchive=${entry.archivePath}\n`,
      );
      for (const target of entry.installedPaths) {
        process.stdout.write(`  - ${target}\n`);
      }
    }
    return;
  }

  if (command === "lint") {
    const parsed = parseLintArgs(args);
    const result = await lintArchive({
      archivePath: parsed.archivePath,
      manifestPath: parsed.manifestPath,
    });
    for (const finding of result.findings) {
      const line = `${finding.rule}: ${finding.filePath} (${finding.detail})\n`;
      if (result.blocking) {
        process.stderr.write(line);
      } else {
        process.stdout.write(line);
      }
    }
    if (result.blocking) {
      process.stderr.write("Lint failed: public bundle contains high-confidence secrets.\n");
      process.exitCode = 1;
      return;
    }
    if (result.findings.length > 0) {
      process.stderr.write("Lint warning: private bundle contains sensitive patterns.\n");
    } else {
      process.stdout.write("Lint passed.\n");
    }
    return;
  }

  if (command === "pull") {
    const pull = await import("./pull.js");
    await pull.runPull(args);
    return;
  }

  if (command === "status") {
    const status = await import("./status.js");
    await status.runStatus(args);
    return;
  }

  if (command === "publish") {
    const publish = await import("./publish.js");
    await publish.runPublish(args);
    return;
  }

  if (command === "unpublish") {
    const unpublish = await import("./unpublish.js");
    await unpublish.runUnpublish(args);
    return;
  }

  if (command === "import") {
    const importCmd = await import("./import.js");
    await importCmd.runImport(args);
    return;
  }

  if (command === "delete") {
    const deleteCmd = await import("./delete.js");
    await deleteCmd.runDelete(args);
    return;
  }

  if (command === "setup") {
    const setup = await import("./setup.js");
    await setup.runSetup(args);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
