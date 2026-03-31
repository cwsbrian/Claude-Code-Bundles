import { writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as processStdin, stdout as processStdout } from "node:process";

type WizardOptions = {
  cwd: string;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  env?: NodeJS.ProcessEnv;
};

const checklistChoices = [
  "skills",
  "hooks",
  "commands",
  "templates",
] as const;

function parseChecklist(value: string): string[] {
  if (!value.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= checklistChoices.length)
    .map((n) => checklistChoices[n - 1]);
}

export async function createWizard(options: WizardOptions): Promise<string> {
  const stdin = options.stdin ?? processStdin;
  const stdout = options.stdout ?? processStdout;
  const env = options.env ?? process.env;
  const nonInteractive = env.BUNDLE_CLI_NONINTERACTIVE === "1";

  let name = env.BUNDLE_CLI_NAME ?? "My Bundle";
  let visibility = (env.BUNDLE_CLI_VISIBILITY ?? "private") as
    | "private"
    | "public";
  let selected = parseChecklist(env.BUNDLE_CLI_ITEMS ?? "1,2,3,4");

  if (!nonInteractive) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    name = (await rl.question("Bundle name: ")).trim();

    const visibilityChoice = (
      await rl.question("Visibility (1=private, 2=public): ")
    ).trim();
    visibility = visibilityChoice === "2" ? "public" : "private";

    stdout.write("Include components:\n");
    checklistChoices.forEach((choice, idx) =>
      stdout.write(`  ${idx + 1}) ${choice}\n`),
    );
    selected = parseChecklist(
      await rl.question("Select numbers (comma-separated, blank for none): "),
    );
    rl.close();
  }

  const bundleId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const payloadPath = selected.length > 0 ? "payload" : ".";

  const manifest = {
    schema_version: "1.0.0",
    bundle_id: bundleId || "bundle",
    name: name || "bundle",
    visibility,
    version: "0.1.0",
    manifest_path: "bundle.json",
    payload_path: payloadPath,
  };

  const outPath = path.join(options.cwd, "bundle.json");
  await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return outPath;
}
