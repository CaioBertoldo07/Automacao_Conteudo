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

// Veo 3 via Google AI REST API (same key as GOOGLE_API_KEY / VEO_API_KEY).
// The @google/generative-ai SDK v0.24 does not expose Veo endpoints, so we
// call the underlying HTTP API with native fetch (Node 18+).

const VEO_MODEL = "veo-3.0-generate-001";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Maximum time (ms) to wait for Veo to finish before falling back to image. */
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 8_000;

function buildVideoPrompt(input: VideoGenerationInput): string {
  return `Short professional Instagram Reel for a Brazilian small business.

Business: ${input.companyName}
Industry: ${input.niche}
Post concept: ${input.postTitle}
Visual concept: ${input.postDescription}

Style: modern, vibrant, clean, professional. No text overlay. 9:16 vertical format. Instagram-ready. High quality. 8 seconds.`;
}

interface OperationResponse {
  name: string;
  done?: boolean;
  error?: { code: number; message: string };
  response?: {
    // Actual Veo API response: generatedSamples is nested under generateVideoResponse
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: { uri?: string; encoding?: string };
      }>;
    };
    // Keep old shape as fallback in case API changes
    generatedSamples?: Array<{
      video?: { uri?: string; encoding?: string };
    }>;
  };
}

async function startVideoGeneration(prompt: string, apiKey: string): Promise<string> {
  const url = `${BASE_URL}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio: "9:16", durationSeconds: 8 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Veo: falha ao iniciar geração (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { name?: string };
  if (!data.name) throw new Error("Veo: operação sem nome na resposta.");
  return data.name;
}

async function pollOperation(operationName: string, apiKey: string): Promise<OperationResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let attempts = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;

    const url = `${BASE_URL}/${operationName}?key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Veo: falha ao consultar operação (${res.status}): ${body}`);
    }

    const op = (await res.json()) as OperationResponse;

    if (op.error) {
      throw new Error(`Veo: erro na geração: ${op.error.message}`);
    }

    if (op.done) return op;
  }

  throw new Error("Veo: timeout — vídeo não ficou pronto dentro do prazo.");
}

async function downloadAsBase64(videoUri: string, apiKey: string): Promise<{ base64: string; mimeType: string }> {
  // The URI may already contain query params (e.g. ?alt=media), so append key with & or ?
  const separator = videoUri.includes("?") ? "&" : "?";
  const url = `${videoUri}${separator}key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Veo: falha ao baixar vídeo (${res.status}).`);
  }

  const mimeType = res.headers.get("content-type") ?? "video/mp4";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mimeType };
}

/**
 * Attempts to generate a short video using Veo 3.
 *
 * Fallback behaviour when Veo is unavailable or times out:
 *   Returns { available: false, reason: "..." }.
 *   The caller (content.service) then falls back to generateImage() and
 *   stores the resulting static image as the REEL's mediaUrl.
 */
export async function generateVideo(input: VideoGenerationInput): Promise<VideoResult> {
  const apiKey = env.veoApiKey || env.googleApiKey;

  if (!apiKey) {
    return {
      available: false,
      reason: "VEO_API_KEY / GOOGLE_API_KEY não configurada — REEL gerado com imagem estática.",
    };
  }

  try {
    const prompt = buildVideoPrompt(input);
    const operationName = await startVideoGeneration(prompt, apiKey);
    const operation = await pollOperation(operationName, apiKey);

    // Support both response shapes: new (generateVideoResponse wrapper) and legacy (flat)
    const samples =
      operation.response?.generateVideoResponse?.generatedSamples ??
      operation.response?.generatedSamples;
    const sample = samples?.[0];
    const videoUri = sample?.video?.uri;

    if (!videoUri) {
      return { available: false, reason: "Veo: nenhum vídeo na resposta da operação." };
    }

    // mimeType comes from the download response Content-Type header
    const { base64, mimeType } = await downloadAsBase64(videoUri, apiKey);
    return { available: true, base64, mimeType };
  } catch (err) {
    const reason = (err as Error).message ?? "Erro desconhecido no Veo.";
    return { available: false, reason };
  }
}
