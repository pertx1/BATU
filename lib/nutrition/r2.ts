import "server-only";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Fotos de comida en Cloudflare R2 (API compatible con S3). El bucket es
 * privado: las fotos solo se ven a través de /api/nutrition/photos/…, que
 * comprueba que son del usuario. Todas cuelgan de users/{userId}/.
 */

function config() {
  const env = (n: string) => process.env[n]?.trim() || null;
  const accountId = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET");
  // R2_ENDPOINT solo para pruebas locales con un servidor compatible con S3.
  const endpoint = env("R2_ENDPOINT") ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

export function photosConfigured(): boolean {
  return config() !== null;
}

let cached: { client: S3Client; bucket: string } | null = null;

function r2() {
  const c = config();
  if (!c) throw new Error("R2 no está configurado");
  if (!cached || cached.bucket !== c.bucket) {
    cached = {
      bucket: c.bucket,
      client: new S3Client({
        region: "auto",
        endpoint: c.endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      }),
    };
  }
  return cached;
}

export const userPrefix = (userId: string) => `users/${userId}/`;

export function mealPhotoKey(userId: string, mealId: string, ext: "jpg" | "webp") {
  return `${userPrefix(userId)}meals/${mealId}.${ext}`;
}

export async function putPhoto(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = r2();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getPhoto(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  const { client, bucket } = r2();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    return { body: await res.Body.transformToByteArray(), contentType: res.ContentType ?? "image/jpeg" };
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deletePhoto(key: string) {
  const { client, bucket } = r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Borra todas las fotos de un usuario (al eliminar la cuenta). */
export async function deleteUserPhotos(userId: string) {
  if (!photosConfigured()) return;
  const { client, bucket } = r2();
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: userPrefix(userId), ContinuationToken: token }));
    const keys = (page.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);
    if (keys.length) {
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}
