import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

// Defaults to a currently available image-capable model and can be overridden by env.
const IMAGE_MODEL = env.googleImageModel;

export interface ImageGenerationInput {
  companyName: string;
  niche: string;
  postTitle: string;
  postDescription: string;
  brandTone: string;
  format: "IMAGE" | "REEL" | "STORY";
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

interface BlobPart {
  inlineData: { data: string; mimeType: string };
}

function isBlobPart(p: unknown): p is BlobPart {
  return (
    typeof p === "object" &&
    p !== null &&
    "inlineData" in p &&
    typeof (p as BlobPart).inlineData?.data === "string"
  );
}

function buildImagePrompt(input: ImageGenerationInput): string {
  const aspectNote = input.format === "IMAGE" ? "square 1:1" : "vertical 9:16";

  return `Professional Instagram marketing image for a Brazilian small business.

Business: ${input.companyName}
Industry: ${input.niche}
Post concept: ${input.postTitle}
Visual concept: ${input.postDescription}
Brand tone: ${input.brandTone}
Format: ${aspectNote}

Style: modern, clean, vibrant, professional. No text overlay. Instagram-ready. High quality.`;
}

export async function generateImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  if (!env.googleApiKey) {
    throw Object.assign(new Error("GOOGLE_API_KEY não configurada."), { statusCode: 503 });
  }

  const client = new GoogleGenerativeAI(env.googleApiKey);
  const model = client.getGenerativeModel({ model: IMAGE_MODEL });

  // responseModalities is supported at runtime but not yet in the typings for this
  // SDK version — double assertion bypasses the stale GenerationConfig type.
  type ContentRequest = Parameters<typeof model.generateContent>[0];
  const response = await model.generateContent(
    {
      contents: [{ role: "user", parts: [{ text: buildImagePrompt(input) }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    } as unknown as ContentRequest
  );

  const parts: unknown[] =
    (response.response.candidates?.[0]?.content?.parts as unknown[]) ?? [];

  const imagePart = parts.find(isBlobPart);

  if (!imagePart) {
    throw Object.assign(new Error("Gemini não retornou imagem na resposta."), { statusCode: 502 });
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}
