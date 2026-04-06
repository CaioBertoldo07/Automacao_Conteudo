import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../config/env";

const MODEL = process.env.GOOGLE_MODEL?.trim() || "gemini-2.5-flash";

const captionOutputSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(3).max(30),
});

export type GeneratedCaption = z.infer<typeof captionOutputSchema>;

export interface CaptionContext {
  companyName: string;
  niche: string;
  city: string;
  tone: string;
  brandTone: string;
  postTitle: string;
  postObjective: string;
  postFormat: "IMAGE" | "REEL" | "STORY";
  postHook: string;
  postDescription: string;
  postCta: string;
  /** Optional: description of a company media image to anchor the caption. */
  mediaDescription?: string;
  /** Optional: tags from the company media image for richer context. */
  mediaTags?: string[];
}

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

function buildCaptionPrompt(ctx: CaptionContext): string {
  const formatLabel =
    ctx.postFormat === "REEL"
      ? "Reel"
      : ctx.postFormat === "STORY"
        ? "Story"
        : "post de imagem";

  return `Você é um copywriter especializado em Instagram para pequenas empresas brasileiras.

Crie uma legenda e hashtags para um ${formatLabel} do Instagram.

Empresa: ${ctx.companyName}
Nicho: ${ctx.niche}
Cidade: ${ctx.city}
Tom de comunicação: ${ctx.tone}
Tom da marca: ${ctx.brandTone}

Briefing do post:
- Título: ${ctx.postTitle}
- Objetivo: ${ctx.postObjective}
- Hook: ${ctx.postHook}
- Descrição: ${ctx.postDescription}
- CTA: ${ctx.postCta}

${ctx.mediaDescription ? `Contexto da imagem da empresa:
- Descrição: ${ctx.mediaDescription}${ctx.mediaTags && ctx.mediaTags.length > 0 ? `\n- Elementos: ${ctx.mediaTags.join(", ")}` : ""}
A legenda deve ser baseada nessa imagem real da empresa, tornando-a relevante ao conteúdo visual.

` : ""}IMPORTANTE: Responda APENAS com um JSON válido. Sem markdown, sem explicações, somente o JSON puro.

{
  "caption": "texto completo da legenda com hook, desenvolvimento e CTA",
  "hashtags": ["hashtag1", "hashtag2"]
}

Regras:
- caption entre 100 e 2200 caracteres, com emojis moderados, CTA ao final
- hashtags: entre 10 e 20 tags relevantes, sem o símbolo # (será adicionado automaticamente)
- Todo o conteúdo em Português do Brasil`;
}

export async function generateCaption(ctx: CaptionContext): Promise<GeneratedCaption> {
  if (!env.googleApiKey) {
    throw Object.assign(new Error("GOOGLE_API_KEY não configurada."), { statusCode: 503 });
  }

  const client = new GoogleGenerativeAI(env.googleApiKey);
  const model = client.getGenerativeModel({ model: MODEL });

  const response = await model.generateContent(buildCaptionPrompt(ctx));
  const text = response.response.text();

  if (!text) {
    throw Object.assign(new Error("Resposta vazia do agente de conteúdo."), { statusCode: 502 });
  }

  const jsonText = extractJson(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw Object.assign(
      new Error("Resposta do agente de conteúdo em formato JSON inválido."),
      { statusCode: 502 }
    );
  }

  const result = captionOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw Object.assign(
      new Error(`Estrutura da legenda inválida: ${result.error.errors[0].message}`),
      { statusCode: 502 }
    );
  }

  return result.data;
}
