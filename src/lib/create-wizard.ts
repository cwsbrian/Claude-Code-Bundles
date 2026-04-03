import { writeFile } from "node:fs/promises";
import path from "node:path";

type WizardOptions = {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  name?: string;
  visibility?: string;
  items?: string;
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
  const env = options.env ?? process.env;

  const name = options.name ?? env.BUNDLE_CLI_NAME ?? "My Bundle";
  const visibility = (options.visibility ?? env.BUNDLE_CLI_VISIBILITY ?? "private") as
    | "private"
    | "public";
  const selected = parseChecklist(options.items ?? env.BUNDLE_CLI_ITEMS ?? "1,2,3,4");

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
