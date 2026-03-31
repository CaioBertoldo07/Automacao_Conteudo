import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../config/env";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

const postIdeaSchema = z.object({
  title: z.string(),
  objective: z.string(),
  format: z.enum(["IMAGE", "REEL", "STORY"]),
  hook: z.string(),
  description: z.string(),
  cta: z.string(),
});

const strategyContentSchema = z.object({
  summary: z.string(),
  businessGoals: z.array(z.string()).min(1),
  targetAudience: z.string(),
  brandTone: z.string(),
  contentPillars: z.array(z.string()).min(1),
  postingCadence: z.string(),
  primaryCTA: z.string(),
  postIdeas: z.array(postIdeaSchema).min(8),
});

export type StrategyContent = z.infer<typeof strategyContentSchema>;

export interface CompanyContext {
  name: string;
  niche: string;
  description: string;
  city: string;
  tone: string;
  postingFrequency: number;
  brandProfile?: {
    targetAudience: string;
    mainProducts: string;
    communicationStyle: string;
  } | null;
}

function buildPrompt(company: CompanyContext): string {
  const brandSection = company.brandProfile
    ? `
Perfil de marca:
- Público-alvo: ${company.brandProfile.targetAudience}
- Principais produtos/serviços: ${company.brandProfile.mainProducts}
- Estilo de comunicação: ${company.brandProfile.communicationStyle}`
    : "";

  return `Você é um especialista em marketing de conteúdo para Instagram, focado em pequenos negócios brasileiros.

Gere uma estratégia completa de conteúdo para o Instagram da empresa abaixo.

IMPORTANTE: Responda APENAS com um objeto JSON válido. Sem markdown, sem explicações, sem blocos de código. Somente o JSON puro.

A estrutura do JSON deve ser exatamente esta:
{
  "summary": "resumo executivo da estratégia",
  "businessGoals": ["objetivo 1", "objetivo 2", "objetivo 3"],
  "targetAudience": "descrição detalhada do público-alvo",
  "brandTone": "descrição do tom e voz da marca",
  "contentPillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
  "postingCadence": "frequência e distribuição semanal recomendada",
  "primaryCTA": "chamada para ação principal",
  "postIdeas": [
    {
      "title": "título da ideia",
      "objective": "objetivo específico deste post",
      "format": "IMAGE",
      "hook": "frase de abertura que prende atenção",
      "description": "descrição detalhada do conteúdo",
      "cta": "chamada para ação específica deste post"
    }
  ]
}

Regras obrigatórias:
- postIdeas deve conter entre 10 e 12 ideias variadas
- format deve ser exclusivamente IMAGE, REEL ou STORY
- Todo o conteúdo deve ser em Português do Brasil
- As ideias devem ser específicas e acionáveis para o tipo de negócio
- Distribua os formatos de forma variada entre IMAGE, REEL e STORY

Dados da empresa:
- Nome: ${company.name}
- Nicho: ${company.niche}
- Descrição: ${company.description}
- Cidade: ${company.city}
- Tom de comunicação preferido: ${company.tone}
- Frequência de posts por mês: ${company.postingFrequency}${brandSection}`;
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

export async function generateStrategy(company: CompanyContext): Promise<StrategyContent> {
  if (!env.anthropicApiKey) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY não configurada."), { statusCode: 503 });
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(company) }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw Object.assign(new Error("Resposta inesperada da IA."), { statusCode: 502 });
  }

  const jsonText = extractJson(block.text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw Object.assign(new Error("Resposta da IA em formato JSON inválido."), { statusCode: 502 });
  }

  const result = strategyContentSchema.safeParse(parsed);
  if (!result.success) {
    throw Object.assign(
      new Error(`Estrutura da estratégia inválida: ${result.error.errors[0].message}`),
      { statusCode: 502 }
    );
  }

  return result.data;
}
