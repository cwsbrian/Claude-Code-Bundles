import AdmZip from "adm-zip";
import { basename } from "node:path";
import type { LintFinding } from "./lint.js";
import { computeSnapshotId, type SnapshotFile } from "./snapshot-hash.js";

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

/**
 * Server upload path (Phase 2): any high-confidence finding **blocks** upload regardless of visibility.
 */
export function scanZipBufferForSecrets(zipBuffer: Buffer): LintFinding[] {
  const zip = new AdmZip(zipBuffer);
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
        detail: String(`matched high-risk basename pattern ${riskyName}`),
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

  return findings;
}

/** Normalized snapshot hash over zip payload entries (excludes bundle.json). Matches Phase 1 pack layout. */
export function computeSnapshotIdFromZipPayload(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const files: SnapshotFile[] = [];
  for (const e of zip.getEntries()) {
    if (e.isDirectory) {
      continue;
    }
    const name = e.entryName.replace(/\\/g, "/");
    if (name === "bundle.json" || name.endsWith("/bundle.json")) {
      continue;
    }
    files.push({ relativePath: name, content: e.getData() });
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return computeSnapshotId(files);
}

/** Extract bundle.json text from zip; throws if missing. */
export function extractManifestJsonFromZip(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntry("bundle.json");
  if (!entry || entry.isDirectory) {
    throw new Error("Archive must contain bundle.json at zip root.");
  }
  return entry.getData().toString("utf8");
}
