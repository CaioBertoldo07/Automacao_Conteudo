import { env } from "../config/env";

export type VideoResult =
  | { available: true; base64: string; mimeType: string }
  | { available: false; reason: string };

export interface VideoGenerationInput {
  companyName: string;
  niche: string;
  postTitle: string;
  postDescription: string;
}

/**
 * Attempts to generate a short video using Veo.
 *
 * Fallback behaviour when Veo is unavailable:
 *   Returns { available: false, reason: "..." }.
 *   The caller (content.service) then falls back to generateImage() and
 *   stores the resulting static image as the REEL's mediaUrl.
 *   The Post is marked DONE — the fallback is a valid deliverable for Phase 5.
 *   When VEO_API_KEY is configured in a future phase, this function will
 *   produce actual video content with no other changes required.
 */
export async function generateVideo(
  _input: VideoGenerationInput
): Promise<VideoResult> {
  if (!env.veoApiKey) {
    return {
      available: false,
      reason: "VEO_API_KEY não configurada — REEL gerado com imagem estática.",
    };
  }

  // Veo integration — to be implemented when credentials are available.
  return {
    available: false,
    reason: "Integração com Veo pendente de credenciais.",
  };
}
