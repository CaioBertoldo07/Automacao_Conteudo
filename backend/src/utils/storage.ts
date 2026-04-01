/**
 * Storage abstraction for generated media.
 *
 * Phase 5 implementation: encodes content as an inline data URI so the system
 * works end-to-end without external cloud credentials.
 *
 * Future phases: swap this implementation for an S3/R2/GCS uploader based on
 * STORAGE_PROVIDER env var — the interface (uploadMedia → { publicUrl }) stays
 * unchanged, so no other files need to change.
 */

export interface UploadResult {
  publicUrl: string;
}

export async function uploadMedia(
  base64: string,
  mimeType: string
): Promise<UploadResult> {
  const publicUrl = `data:${mimeType};base64,${base64}`;
  return { publicUrl };
}
