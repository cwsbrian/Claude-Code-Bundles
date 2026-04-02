import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getR2Endpoint(): string {
  const explicit = process.env.R2_ENDPOINT?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error(
      "R2: set R2_ENDPOINT or R2_ACCOUNT_ID (e.g. https://<account_id>.r2.cloudflarestorage.com)",
    );
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getS3Client(): S3Client {
  if (client) return client;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2: missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY");
  }
  client = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getBundleBucketName(): string {
  return process.env.BUNDLE_STORAGE_BUCKET ?? "bundle-archives";
}

export async function putBundleZipObject(key: string, body: Buffer): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getBundleBucketName(),
      Key: key,
      Body: body,
      ContentType: "application/zip",
    }),
  );
}

export async function getBundleZipObject(key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const out = await s3.send(
    new GetObjectCommand({
      Bucket: getBundleBucketName(),
      Key: key,
    }),
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes?.length) {
    throw new Error("R2: empty object body");
  }
  return Buffer.from(bytes);
}

export async function copyBundleZipObject(sourceKey: string, destKey: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getBundleBucketName();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/${sourceKey}`,
      Key: destKey,
      ContentType: "application/zip",
    }),
  );
}

export async function deleteBundleZipObject(key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBundleBucketName(),
      Key: key,
    }),
  );
}

export async function deleteBundleZipObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: getBundleBucketName(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
