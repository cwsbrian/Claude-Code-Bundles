import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const SRC_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "commands",
  "bundle",
);

const DEST_DIR = path.join(os.homedir(), ".claude", "commands", "bundle");

export async function installCommands(
  force: boolean = false,
): Promise<string[]> {
  await mkdir(DEST_DIR, { recursive: true });

  const files = await readdir(SRC_DIR);
  const installed: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const src = path.join(SRC_DIR, file);
    const dest = path.join(DEST_DIR, file);

    if (!force) {
      try {
        await stat(dest);
        process.stdout.write(
          `Skipped ${dest} (already exists, use --force to overwrite)\n`,
        );
        continue;
      } catch {
        // File does not exist, proceed with copy
      }
    }

    await cp(src, dest);
    installed.push(dest);
  }

  return installed;
}

export async function runSetup(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const installed = await installCommands(force);

  if (installed.length === 0) {
    process.stdout.write(
      "All command files already installed. Use --force to overwrite.\n",
    );
  } else {
    process.stdout.write(
      `\nInstalled ${installed.length} command file(s):\n`,
    );
    for (const file of installed) {
      process.stdout.write(`  ${file}\n`);
    }
    process.stdout.write(
      "\nUse /bundle:import, /bundle:pull, /bundle:status, /bundle:browse in Claude Code.\n",
    );
  }
}
