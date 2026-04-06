---
description: "Cria as 5 skill files para Claude Code em .claude/skills/. Execute uma única vez para configurar o ambiente Claude Code deste projeto."
name: "Setup Claude Code Skills"
---

Crie os seguintes 5 arquivos de skill para Claude Code neste projeto.
Cada arquivo deve ser criado exatamente no caminho indicado, com o conteúdo especificado.
Não modifique o conteúdo — ele já está calibrado para os padrões deste repositório.

---

## Skill 1 — `new-endpoint`

Crie o arquivo `.claude/skills/new-endpoint/SKILL.md` com:

```markdown
---
name: new-endpoint
description: "Criar novo endpoint REST neste projeto. Use quando: adicionar rota, criar CRUD, novo recurso de API, novo controller, novo service, adicionar handler HTTP. Segue o padrão route → controller → service com Zod e Prisma."
---

# New Endpoint

Cria um recurso de API completo seguindo o padrão obrigatório deste projeto:
**route → controller → service**. Nunca colocar lógica de negócio nas rotas.

## Quando usar

- Adicionar nova rota HTTP (GET, POST, PUT, PATCH, DELETE)
- Criar um novo recurso (CRUD ou parcial)
- Adicionar endpoints a um recurso existente

## Estrutura obrigatória

```
backend/src/
  routes/<recurso>.routes.ts           ← recebe req, delega ao controller
  controllers/<recurso>.controller.ts  ← valida com Zod, chama service
  services/<recurso>.service.ts        ← lógica de negócio + Prisma
```

## Procedimento

### 1. Route (`routes/<recurso>.routes.ts`)

```typescript
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { make<Recurso>Controller } from "../controllers/<recurso>.controller";

export async function <recurso>Routes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const controller = make<Recurso>Controller(options.prisma);

  fastify.post("/<recurso>", controller.createHandler.bind(controller));
  fastify.get("/<recurso>", controller.listHandler.bind(controller));
  fastify.get("/<recurso>/:id", controller.getHandler.bind(controller));
  fastify.put("/<recurso>/:id", controller.updateHandler.bind(controller));
  fastify.delete("/<recurso>/:id", controller.deleteHandler.bind(controller));
}
```

Rotas que exigem autenticação:
```typescript
fastify.post("/<recurso>", { preHandler: [authMiddleware] }, controller.createHandler.bind(controller));
```

### 2. Controller (`controllers/<recurso>.controller.ts`)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { create<Recurso> } from "../services/<recurso>.service";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório."),
});

export function make<Recurso>Controller(prisma: PrismaClient) {
  return {
    async createHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const result = await create<Recurso>(prisma, body.data, request.user.id);
        return reply.status(201).send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply
          .status(e.statusCode ?? 500)
          .send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
```

**Regras do controller:**
- Sempre `schema.safeParse()` — nunca `schema.parse()`
- Retornar `body.error.errors[0].message` (primeiro erro)
- Bloco `try/catch` em todos os handlers
- `request.user.id` disponível após `authMiddleware`

### 3. Service (`services/<recurso>.service.ts`)

```typescript
import { PrismaClient } from "@prisma/client";

export interface Create<Recurso>Input {
  name: string;
}

export async function create<Recurso>(
  prisma: PrismaClient,
  data: Create<Recurso>Input,
  userId: string
) {
  const existing = await prisma.<modelo>.findFirst({
    where: { name: data.name, userId },
  });
  if (existing) {
    throw { statusCode: 409, message: "<Recurso> já existe." };
  }

  return prisma.<modelo>.create({ data: { ...data, userId } });
}

export async function get<Recurso>ByIdForUser(
  prisma: PrismaClient,
  id: string,
  userId: string
) {
  const record = await prisma.<modelo>.findFirst({ where: { id, userId } });
  if (!record) {
    throw { statusCode: 404, message: "<Recurso> não encontrado." };
  }
  return record;
}
```

**Regras do service:**
- Verificar ownership (`userId`) em todos os acessos por ID
- Erros como **objetos literais** `{ statusCode, message }` — nunca `new Error()` puro
- Exportar interfaces explícitas para inputs/outputs
- Nunca importar Fastify

### 4. Registrar no `app.ts`

```typescript
import { <recurso>Routes } from "./routes/<recurso>.routes";
// dentro de buildApp():
fastify.register(<recurso>Routes, { prefix: "/api", prisma });
```

## Convenções de status HTTP

| Situação | Status |
|---|---|
| Criação bem-sucedida | 201 |
| Sucesso geral | 200 |
| Dados inválidos (Zod) | 400 |
| Não autenticado | 401 |
| Sem permissão | 403 |
| Não encontrado | 404 |
| Conflito / duplicado | 409 |
| Erro de IA externo | 502 |
| Serviço externo indisponível | 503 |
| Erro interno | 500 |

## Checklist final

- [ ] Route: apenas registra handlers, sem lógica
- [ ] Controller: Zod `safeParse` + `try/catch` em cada handler
- [ ] Service: ownership check, interfaces exportadas, erros como objetos literais
- [ ] Rota registrada em `app.ts`
- [ ] Sem `any` no TypeScript
```

---

## Skill 2 — `new-agent`

Crie o arquivo `.claude/skills/new-agent/SKILL.md` com:

```markdown
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
```

---

## Skill 3 — `new-worker`

Crie o arquivo `.claude/skills/new-worker/SKILL.md` com:

```markdown
---
name: new-worker
description: "Criar novo worker ou fila BullMQ neste projeto. Use quando: novo job assíncrono, nova fila de processamento, novo tipo de tarefa em background, worker para geração de conteúdo, worker para análise de mídia, agendamento de jobs."
---

# New Worker

Cria uma fila BullMQ e o worker correspondente em `backend/src/queues/` e `backend/src/workers/`.

## Quando usar

- Nova tarefa pesada que não pode bloquear a API
- Novo tipo de geração assíncrona
- Escalar processamento com concorrência controlada

## Filas existentes

```
queues/
  content.queue.ts   ← content-generation (concurrency 3, 3 retries, backoff 5s)
  media.queue.ts     ← media-analysis     (concurrency 1, 5 retries, backoff 60s)
```

## Procedimento

### 1. Fila (`queues/<nome>.queue.ts`)

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const <NOME>_QUEUE_NAME = "<nome-do-job>";

export interface <Nome>JobPayload {
  id: string;
  userId: string;
  // campos específicos do job
}

export const <nome>Queue = new Queue<<Nome>JobPayload>(<NOME>_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});
```

**Configurações por tipo de job:**

| Tipo | `attempts` | `delay` inicial | `concurrency` |
|---|---|---|---|
| Geração Gemini | 3 | 5 000 ms | 3 |
| Análise mídia (free tier) | 5 | 60 000 ms | 1 |
| Notificações | 5 | 2 000 ms | 5 |
| Instagram API | 3 | 10 000 ms | 2 |

### 2. Worker (`workers/<nome>.worker.ts`)

```typescript
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { redisConnection } from "../config/redis";
import { <NOME>_QUEUE_NAME, type <Nome>JobPayload } from "../queues/<nome>.queue";
import { process<Nome> } from "../services/<nome>.service";

export function start<Nome>Worker(): Worker<<Nome>JobPayload> {
  const prisma = new PrismaClient();

  const worker = new Worker<<Nome>JobPayload>(
    <NOME>_QUEUE_NAME,
    async (job) => {
      const { id, userId } = job.data;
      console.log(`[Worker] Processando job ${job.id} — id=${id}`);
      await process<Nome>(prisma, id, userId);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] ✓ Job ${job.id} concluído — id=${job.data.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} falhou: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Erro no worker:", err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("[Worker] Encerrando...");
    await worker.close();
    await prisma.$disconnect();
  });

  return worker;
}
```

### 3. Registrar em `worker.ts`

```typescript
import { start<Nome>Worker } from "./workers/<nome>.worker";

const <nome>Worker = start<Nome>Worker();
console.log(`[Worker] <nome> worker iniciado (concurrency=X)`);
```

### 4. Enfileirar no service (não na rota)

```typescript
import { <nome>Queue } from "../queues/<nome>.queue";

await <nome>Queue.add("<descricao>", { id: record.id, userId });
```

## Regras obrigatórias

- Nunca chamar workers diretamente de uma rota
- O worker instancia seu próprio `PrismaClient` (isolado do app)
- `gracefulShutdown` no SIGTERM é obrigatório
- `concurrency: 1` para APIs com rate limit (Gemini free, Instagram)

## Checklist final

- [ ] Fila com `defaultJobOptions` ajustados para o tipo de job
- [ ] `interface *JobPayload` exportada e tipada (sem `any`)
- [ ] Worker com `concurrency` correto
- [ ] Eventos `completed`, `failed`, `error` logados
- [ ] SIGTERM com graceful shutdown
- [ ] Worker registrado em `backend/src/worker.ts`
- [ ] Fila enfileirada no service, não na rota
```

---

## Skill 4 — `prisma-migration`

Crie o arquivo `.claude/skills/prisma-migration/SKILL.md` com:

```markdown
---
name: prisma-migration
description: "Criar ou alterar modelos no banco de dados deste projeto. Use quando: novo modelo, nova coluna, novo relacionamento, novo enum, criar migration Prisma, alterar schema.prisma, adicionar índice, modificar tabela existente."
---

# Prisma Migration

Adiciona ou modifica modelos em `backend/prisma/schema.prisma` seguindo as convenções deste projeto.

## Quando usar

- Novo modelo (tabela)
- Nova coluna em modelo existente
- Novo relacionamento
- Novo enum ou valor de enum
- Novo índice

## Convenções obrigatórias

**IDs sempre UUID:**
```prisma
id String @id @default(uuid())
```

**Timestamps em todo modelo:**
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

**`onDelete: Cascade` em relacionamentos de dependência:**
```prisma
companyId String
company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
```

**Enums para estados finitos:**
```prisma
enum <Nome>Status {
  PENDING
  PROCESSING
  DONE
  FAILED
}
```

**Índices em colunas de filtro:**
```prisma
@@index([companyId])
@@index([companyId, category])
```

## Enums existentes (não duplicar)

```prisma
enum JobStatus               { PENDING, PROCESSING, DONE, FAILED }
enum ContentType             { IMAGE, REEL, STORY }
enum MediaType               { IMAGE, VIDEO, LOGO }
enum StrategyApprovalStatus  { PENDING_APPROVAL, APPROVED, REJECTED }
```

## Template de novo modelo

```prisma
model <NomeModelo> {
  id        String    @id @default(uuid())
  name      String
  status    JobStatus @default(PENDING)
  metadata  Json?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
}
```

Adicionar relação inversa em `Company`:
```prisma
<nomeModelos> <NomeModelo>[]
```

## Procedimento

```bash
cd backend
npx prisma migrate dev --name <descricao_curta>
```

Convenção de nomes:
- `add_<modelo>` — novo modelo
- `add_<campo>_to_<modelo>` — novo campo
- `add_<nome>_index` — novo índice

## Campos sensíveis

Nunca retornar nas respostas da API:
- `password` (campo de `User`)

Usar `select` explícito ou mapear para interface de response no service.

## Checklist final

- [ ] ID `String @id @default(uuid())`
- [ ] `createdAt` + `updatedAt` presentes
- [ ] `onDelete: Cascade` em relações de dependência
- [ ] Enums existentes reutilizados
- [ ] `@@index` nas colunas de filtro
- [ ] Relação inversa no modelo pai
- [ ] `prisma migrate dev --name <descricao>` executado
- [ ] Interface de response criada no service
```

---

## Skill 5 — `frontend-feature`

Crie o arquivo `.claude/skills/frontend-feature/SKILL.md` com:

```markdown
---
name: frontend-feature
description: "Criar nova feature ou página no frontend deste projeto. Use quando: nova página, novo hook, nova chamada de API no frontend, novo componente de feature, integrar endpoint com React, adicionar rota no frontend, criar formulário, listar dados."
---

# Frontend Feature

Cria uma feature completa no frontend seguindo o padrão:
**página → hook (TanStack Query) → service → type**.

## Quando usar

- Nova página
- Novo hook de dados (`useQuery` / `useMutation`)
- Integrar novo endpoint de backend
- Novo componente de feature

## Estrutura

```
frontend/src/
  pages/<recurso>/       ← componente(s) da página
  hooks/use<Recurso>.ts  ← TanStack Query
  services/api.ts        ← adicionar service ao arquivo existente
  types/index.ts         ← adicionar interfaces ao arquivo existente
```

## Procedimento

### 1. Tipos (`types/index.ts`)

```typescript
export interface <Recurso> {
  id: string;
  name: string;
  createdAt: string;  // datas chegam como string ISO
  updatedAt: string;
}

export interface Create<Recurso>Request {
  name: string;
}
```

### 2. Service (`services/api.ts`)

O `api` já é um axios com `baseURL: "/api"`, interceptor de token JWT e redirect para `/login` em 401.

```typescript
export const <recurso>Service = {
  list: async (): Promise<<Recurso>[]> => {
    const response = await api.get<<Recurso>[]>("/<recurso>s");
    return response.data;
  },
  get: async (id: string): Promise<<Recurso>> => {
    const response = await api.get<<Recurso>>("/<recurso>s/" + id);
    return response.data;
  },
  create: async (data: Create<Recurso>Request): Promise<<Recurso>> => {
    const response = await api.post<<Recurso>>("/<recurso>s", data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete("/<recurso>s/" + id);
  },
};
```

### 3. Hook (`hooks/use<Recurso>.ts`)

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { <recurso>Service } from "@/services/api";

export const <RECURSO>_KEYS = {
  all:    ["<recurso>s"]               as const,
  single: (id: string) => ["<recurso>s", id] as const,
};

export function use<Recurso>s() {
  return useQuery({
    queryKey: <RECURSO>_KEYS.all,
    queryFn:  () => <recurso>Service.list(),
    staleTime: 1000 * 60,
  });
}

export function useCreate<Recurso>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Create<Recurso>Request) => <recurso>Service.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: <RECURSO>_KEYS.all });
    },
  });
}
```

**Polling para dados assíncronos:**
```typescript
refetchInterval: (query) => {
  const data = query.state.data;
  if (!data) return 20_000;
  return data.some((item) => item.status === "PENDING" || item.status === "PROCESSING")
    ? 5_000   // 5s durante processamento
    : 20_000; // 20s idle
},
```

### 4. Página (`pages/<recurso>/index.tsx`)

```tsx
import { use<Recurso>s } from "@/hooks/use<Recurso>";

export default function <Recurso>Page() {
  const { data, isLoading, error } = use<Recurso>s();

  if (isLoading) return <div>Carregando...</div>;
  if (error)     return <div>Erro ao carregar dados.</div>;

  return <div>{/* renderização */}</div>;
}
```

### 5. Registrar rota em `App.tsx`

```tsx
import <Recurso>Page from "@/pages/<recurso>";

<Route path="/<recurso>" element={<PrivateRoute><Recurso>Page /></PrivateRoute>} />
```

## Convenções

| Aspecto | Convenção |
|---|---|
| Datas | `string` ISO — converter com `new Date()` só na exibição |
| Imports | Alias `@/` (configurado no `tsconfig.json`) |
| `staleTime` | Mínimo 30s para dados estáticos |
| `onSuccess` | Sempre invalidar query keys afetadas |

## Checklist final

- [ ] Interface em `types/index.ts` (sem `any`)
- [ ] Service em `services/api.ts` tipado
- [ ] Hook com query keys centralizadas
- [ ] `staleTime` e `refetchInterval` adequados
- [ ] Página em `pages/<recurso>/index.tsx`
- [ ] Rota em `App.tsx`
- [ ] Estados de loading e erro tratados
```

---

Após criar todos os arquivos, confirme que os 5 caminhos existem:
- `.claude/skills/new-endpoint/SKILL.md`
- `.claude/skills/new-agent/SKILL.md`
- `.claude/skills/new-worker/SKILL.md`
- `.claude/skills/prisma-migration/SKILL.md`
- `.claude/skills/frontend-feature/SKILL.md`
