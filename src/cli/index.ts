#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pack } from "../lib/pack.js";
import { unpack } from "../lib/unpack.js";

type ParsedPackArgs = {
  manifestPath: string;
  outArchivePath: string;
};

type ParsedUnpackArgs = {
  archivePath: string;
  outDir: string;
};

function getArgValue(args: string[], ...flags: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) {
      return args[i + 1];
    }
  }
  return undefined;
}

async function validateManifestFile(manifestPath: string): Promise<void> {
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;

  // Phase 1 validation: lightweight shape checks against bundle-1.0.0 schema intent.
  const required = [
    "schema_version",
    "bundle_id",
    "name",
    "visibility",
    "version",
    "manifest_path",
    "payload_path",
  ];

  for (const key of required) {
    if (!(key in manifest)) {
      throw new Error(`Invalid manifest at ${manifestPath}: missing ${key}`);
    }
  }

  if (manifest.schema_version !== "1.0.0") {
    throw new Error(
      `Invalid manifest at ${manifestPath}: schema_version must be 1.0.0`,
    );
  }

  if (manifest.visibility !== "private" && manifest.visibility !== "public") {
    throw new Error(
      `Invalid manifest at ${manifestPath}: visibility must be private or public`,
    );
  }
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

function printUsage(): void {
  console.error(
    "Usage:\n  ccb pack --manifest <path> --out <archive>\n  ccb unpack --archive <path> --out <dir>",
  );
}

export async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "pack") {
    const parsed = parsePackArgs(args);
    await access(parsed.manifestPath);
    await validateManifestFile(parsed.manifestPath);
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

  printUsage();
  process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
