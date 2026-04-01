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
};

function extForMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? ".bin";
}

export async function uploadMedia(
  base64: string,
  mimeType: string
): Promise<UploadResult> {
  // Ensure the uploads directory exists.
  await fs.mkdir(env.mediaDir, { recursive: true });

  const filename = `${crypto.randomUUID()}${extForMime(mimeType)}`;
  const filepath = path.join(env.mediaDir, filename);

  const buffer = Buffer.from(base64, "base64");
  await fs.writeFile(filepath, buffer);

  return { publicUrl: `/media/${filename}` };
}
