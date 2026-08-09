import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .dev.vars / Worker secrets.`
    );
  }
  return value;
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

export async function uploadImage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${requireEnv("R2_PUBLIC_URL")}/${key}`;
}

export async function deleteImage(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
    })
  );
}

/**
 * Best-effort single delete — never throws. Call this only after the
 * matching DB row is already gone, so a failure here just leaves a
 * harmless orphaned R2 object instead of blocking the request.
 */
export async function deleteImageSafe(key: string): Promise<void> {
  try {
    await deleteImage(key);
  } catch (err) {
    console.error(`R2 delete failed for key "${key}" (continuing anyway):`, err);
  }
}

/**
 * Best-effort bulk delete — never throws. Same reasoning as
 * deleteImageSafe, just for cascade cleanups (product/variant delete).
 */
export async function deleteImagesSafe(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: requireEnv("R2_BUCKET"),
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
        },
      })
    );
  } catch (err) {
    console.error("R2 bulk delete failed (continuing anyway):", err);
  }
}

export async function renameImage(oldKey: string, newKey: string): Promise<string> {
  await r2.send(
    new CopyObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      CopySource: `${requireEnv("R2_BUCKET")}/${oldKey}`,
      Key: newKey,
    })
  );

  await deleteImage(oldKey);

  return `${requireEnv("R2_PUBLIC_URL")}/${newKey}`;
}