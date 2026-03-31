import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ErrorObject } from "ajv";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default as new (options?: {
  allErrors?: boolean;
  strict?: boolean;
  validateFormats?: boolean;
}) => {
  compile: (schema: object) => {
    (data: unknown): boolean;
    errors?: ErrorObject[] | null;
  };
};


export type BundleManifest = {
  schema_version: string;
  bundle_id: string;
  name: string;
  visibility: "private" | "public";
  version: string;
  manifest_path: string;
  payload_path: string;
};

type ValidationIssue = {
  path: string;
  message: string;
};

type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../schemas/bundle-1.0.0.schema.json",
);

let cachedSchema: object | null = null;

async function loadSchema(): Promise<object> {
  if (cachedSchema) {
    return cachedSchema;
  }
  const raw = await readFile(schemaPath, "utf8");
  cachedSchema = JSON.parse(raw) as object;
  return cachedSchema;
}

export async function validateManifestObject(
  manifest: unknown,
): Promise<ValidationResult> {
  const schema = await loadSchema();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  const issues: ValidationIssue[] = (validate.errors ?? []).map((error: ErrorObject) => ({
    path: error.instancePath || "/",
    message: error.message ?? "validation error",
  }));
  return { valid: Boolean(valid), issues };
}

export async function validateManifestFile(
  manifestPath: string,
): Promise<ValidationResult> {
  const raw = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return validateManifestObject(parsed);
}

export async function loadManifest(manifestPath: string): Promise<BundleManifest> {
  const result = await validateManifestFile(manifestPath);
  if (!result.valid) {
    throw new Error(
      `Manifest validation failed: ${result.issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join("; ")}`,
    );
  }
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as BundleManifest;
}
