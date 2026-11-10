import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
export const ALLOWED_IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Stores a user's private upload; returns the URL served by /api/uploads. */
export async function saveUpload(userId: string, data: Buffer, mimeType: string) {
  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  if (!ext) throw new Error("UNSUPPORTED_TYPE");
  const dir = path.join(UPLOAD_ROOT, userId);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), data);
  return `/api/uploads/${userId}/${name}`;
}
