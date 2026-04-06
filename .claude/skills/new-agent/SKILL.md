---
name: new-agent
description: "Criar novo agente de IA neste projeto. Use quando: novo agente Gemini, novo adaptador de IA, integrar nova plataforma (Instagram, TikTok, LinkedIn), novo tipo de geração (texto, imagem, vídeo, análise), nova chamada à API do Google."
---

# New Agent

Cria um agente ou adaptador de IA seguindo o padrão estabelecido em `backend/src/agents/`.
Todos os agentes chamam a API Gemini (Google Generative AI), extraem JSON da resposta
e validam com Zod.

## Quando usar

- Novo tipo de geração de conteúdo (texto, imagem, análise, strategy)
- Novo adaptador de plataforma ou modelo de IA
- Extensão de agente existente com nova funcionalidade

## Estrutura existente

```
agents/
  claude.agent.ts    ← geração de estratégia (array de post ideas)
  content.agent.ts   ← legendas + hashtags
  image.adapter.ts   ← geração de imagens (Gemini Imagen)
  media.agent.ts     ← análise de mídia (categorização + tags)
  video.adapter.ts   ← geração de vídeos (Veo 3)
```

## Procedimento

### 1. Interface de contexto (input)

```typescript
export interface <Funcao>Context {
  companyName: string;
  niche: string;
  city: string;
  tone: string;
  brandTone: string;
  // campos específicos desta geração
}
```

### 2. Schema Zod de output

```typescript
import { z } from "zod";

const <funcao>OutputSchema = z.object({
  field1: z.string().min(1),
  field2: z.array(z.string()).min(1),
});

export type <Funcao>Output = z.infer<typeof <funcao>OutputSchema>;
```

### 3. Extrator de JSON (padrão obrigatório)

```typescript
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
```

### 4. Prompt em função separada

```typescript
function build<Funcao>Prompt(ctx: <Funcao>Context): string {
  return `Você é um especialista em ...

Empresa: ${ctx.companyName}
Nicho: ${ctx.niche}
Cidade: ${ctx.city}
Tom de comunicação: ${ctx.tone}

IMPORTANTE: Responda APENAS com um JSON válido. Sem markdown, sem explicações.

{
  "field1": "...",
  "field2": ["..."]
}

Regras:
- ...
- Todo o conteúdo em Português do Brasil`;
}
```

### 5. Função principal

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const MODEL = process.env.GOOGLE_MODEL?.trim() || "gemini-2.5-flash";

export async function generate<Funcao>(ctx: <Funcao>Context): Promise<<Funcao>Output> {
  if (!env.googleApiKey) {
    throw Object.assign(new Error("GOOGLE_API_KEY não configurada."), { statusCode: 503 });
  }

  const client = new GoogleGenerativeAI(env.googleApiKey);
  const model = client.getGenerativeModel({ model: MODEL });

  const response = await model.generateContent(build<Funcao>Prompt(ctx));
  const text = response.response.text();

  if (!text) {
    throw Object.assign(new Error("Resposta vazia do agente."), { statusCode: 502 });
  }

  const jsonText = extractJson(text);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw Object.assign(new Error("Resposta do agente não é JSON válido."), { statusCode: 502 });
  }

  const result = <funcao>OutputSchema.safeParse(parsed);
  if (!result.success) {
    throw Object.assign(new Error("Estrutura de resposta do agente inválida."), { statusCode: 502 });
  }

  return result.data;
}
```

## Regras obrigatórias

- `statusCode: 503` se a API key não estiver configurada
- `statusCode: 502` para erros de resposta da IA (vazia, JSON inválido, schema inválido)
- Nunca `throw new Error()` puro — sempre `throw Object.assign(new Error(...), { statusCode })`
- Sempre validar output com Zod (a IA pode retornar campos faltando)
- Sempre usar `extractJson()` antes de `JSON.parse()`
- Exportar tipo derivado do schema: `export type X = z.infer<typeof schema>`
- `MODEL` sempre lê de `process.env.GOOGLE_MODEL` com fallback `"gemini-2.5-flash"`
- Nunca chamar o agente diretamente nas rotas

## Checklist final

- [ ] Interface `*Context` com campos da empresa
- [ ] Schema Zod de output + tipo exportado
- [ ] `extractJson()` antes do `JSON.parse()`
- [ ] `safeParse` com erro `502` em caso de falha
- [ ] Sem chamada direta da IA nas rotas
- [ ] `MODEL` configurável via `GOOGLE_MODEL` env var
