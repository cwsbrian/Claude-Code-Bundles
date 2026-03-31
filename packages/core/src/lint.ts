import AdmZip from "adm-zip";
import { basename } from "node:path";
import { loadManifest } from "./manifest-validate.js";

export type LintFinding = {
  filePath: string;
  rule: string;
  detail: string;
};

export type LintResult = {
  blocking: boolean;
  findings: LintFinding[];
  visibility: "public" | "private";
};

export type LintArchiveOptions = {
  archivePath: string;
  manifestPath: string;
};

const riskyBasenameMatchers: RegExp[] = [
  /^\.env$/i,
  /\.pem$/i,
  /^id_rsa$/i,
  /^credentials\.json$/i,
];

const secretContentMatchers: Array<{ rule: string; pattern: RegExp; detail: string }> = [
  {
    rule: "secret-api-key",
    pattern: /sk-[A-Za-z0-9]{20,}/g,
    detail: "matched OpenAI-style key pattern",
  },
  {
    rule: "secret-aws-access-key-id",
    pattern: /AKIA[0-9A-Z]{16}/g,
    detail: "matched AWS access key id pattern",
  },
];

function hasRiskyBasename(filePath: string): string | null {
  const base = basename(filePath);
  for (const matcher of riskyBasenameMatchers) {
    if (matcher.test(base)) {
      return matcher.source;
    }
  }
  return null;
}

export async function lintArchive(options: LintArchiveOptions): Promise<LintResult> {
  // D-09: local-only scan with no remote/LLM calls.
  const manifest = await loadManifest(options.manifestPath);
  const zip = new AdmZip(options.archivePath);
  const findings: LintFinding[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue;
    }
    const filePath = entry.entryName;
    const riskyName = hasRiskyBasename(filePath);
    if (riskyName) {
      findings.push({
        filePath,
        rule: "risky-filename",
        detail: `matched high-risk basename pattern ${riskyName}`,
      });
    }

    const content = entry.getData().toString("utf8");
    for (const matcher of secretContentMatchers) {
      if (matcher.pattern.test(content)) {
        findings.push({
          filePath,
          rule: matcher.rule,
          detail: matcher.detail,
        });
      }
      matcher.pattern.lastIndex = 0;
    }
  }

  const blocking = manifest.visibility === "public" && findings.length > 0;
  return { blocking, findings, visibility: manifest.visibility };
}
