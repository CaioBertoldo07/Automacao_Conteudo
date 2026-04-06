import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../config/env";

const MODEL = process.env.GOOGLE_MODEL?.trim() || "gemini-2.5-flash";

export interface MediaAnalysisInput {
  base64: string;
  mimeType: string;
  companyName: string;
  niche: string;
}

const mediaAnalysisSchema = z.object({
  category: z.enum(["produto", "bastidores", "loja", "equipe", "logo", "outros"]),
  tags: z.array(z.string()).max(10),
  description: z.string().max(150),
  detectedElements: z.array(z.string()),
  dominantColors: z.array(z.string()),
  suggestedUse: z.string(),
});

export type MediaAnalysisResult = z.infer<typeof mediaAnalysisSchema>;

function extractJson(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) return codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

function buildAnalysisPrompt(companyName: string, niche: string): string {
  return `Você é um especialista em análise de imagens para marketing digital de pequenas empresas brasileiras.

Analise esta imagem da empresa "${companyName}" (nicho: ${niche}) e responda APENAS com um JSON válido, sem markdown, sem explicações.

{
  "category": "produto|bastidores|loja|equipe|logo|outros",
  "tags": ["tag1", "tag2"],
  "description": "descrição objetiva em português com no máximo 150 caracteres",
  "detectedElements": ["elemento1", "elemento2"],
  "dominantColors": ["#RRGGBB"],
  "suggestedUse": "sugestão de uso para Instagram (ex: post de produto, story de bastidores)"
}

Regras:
- category: escolha a categoria que melhor descreve a imagem
- tags: máximo 10 tags descritivas relevantes para Instagram
- description: objetiva, em português, máximo 150 caracteres
- detectedElements: objetos, pessoas, ambientes identificados na imagem
- dominantColors: cores predominantes em formato hex aproximado
- suggestedUse: como essa imagem seria melhor usada no Instagram`;
}

export async function analyzeMedia(input: MediaAnalysisInput): Promise<MediaAnalysisResult> {
  if (!env.googleApiKey) {
    throw Object.assign(new Error("GOOGLE_API_KEY não configurada."), { statusCode: 503 });
  }

  const client = new GoogleGenerativeAI(env.googleApiKey);
  const model = client.getGenerativeModel({ model: MODEL });

  const response = await model.generateContent([
    {
      inlineData: {
        data: input.base64,
        mimeType: input.mimeType,
      },
    },
    buildAnalysisPrompt(input.companyName, input.niche),
  ]);

  const text = response.response.text();
  if (!text) {
    throw Object.assign(new Error("Resposta vazia do agente de análise de mídia."), { statusCode: 502 });
  }

  const jsonText = extractJson(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw Object.assign(
      new Error("Resposta do agente de análise em formato JSON inválido."),
      { statusCode: 502 }
    );
  }

  const result = mediaAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw Object.assign(
      new Error(`Estrutura da análise inválida: ${result.error.errors[0].message}`),
      { statusCode: 502 }
    );
  }

  return result.data;
}
