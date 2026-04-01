/**
 * Storage for generated media — Phase 5: local filesystem.
 *
 * Saves binary content to MEDIA_DIR and returns a /media/<filename> URL
 * served by the static route registered in app.ts.
 *
 * Future phases: swap uploadMedia for an S3/R2/GCS implementation driven by
 * STORAGE_PROVIDER — the interface (base64 + mimeType → { publicUrl }) stays
 * unchanged, so no other file needs to change.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env";

export interface UploadResult {
  publicUrl: string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/mpeg": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-msvideo": ".avi",
  "application/octet-stream": ".bin",
};

/**
 * Normalize MIME type: remove charset, boundary, and other parameters.
 * Examples:
 *   "video/mp4; charset=utf-8" → "video/mp4"
 *   "image/png; boundary=something" → "image/png"
 */
function normalizeMimeType(mimeType: string): string {
  return mimeType.includes(";") ? mimeType.split(";")[0].trim() : mimeType;
}

function extForMime(mimeType: string): string {
  const normalized = normalizeMimeType(mimeType);
  return MIME_TO_EXT[normalized] ?? ".bin";
}

export async function uploadMedia(
  base64: string,
  mimeType: string
): Promise<UploadResult> {
  // Ensure the uploads directory exists.
  await fs.mkdir(env.mediaDir, { recursive: true });

  const ext = extForMime(mimeType);
  const filename = `${crypto.randomUUID()}${ext}`;
  const filepath = path.join(env.mediaDir, filename);

  const buffer = Buffer.from(base64, "base64");
  await fs.writeFile(filepath, buffer);

  return { publicUrl: `/media/${filename}` };
}
