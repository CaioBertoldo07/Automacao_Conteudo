# Prompt: Biblioteca de Mídia da Empresa + Perfil de Branding

Você é um engenheiro sênior TypeScript trabalhando num SaaS de automação de conteúdo para Instagram.

Antes de qualquer ação, leia obrigatoriamente:

- planejamento.md
- arquitetura.md
- banco.md
- desenvolvimento.md
- CLAUDE.md

---

## FEATURE: Biblioteca de Mídia da Empresa + Perfil de Branding

Implemente em etapas sequenciais. Não avance para a próxima etapa antes de concluir a atual. Explique o que será criado, por que e onde antes de gerar código.

---

## ETAPA 1 — Banco de Dados: Novos Modelos e Extensão do BrandProfile

### 1.1 — Novo modelo `CompanyMedia` em `backend/prisma/schema.prisma`

```prisma
model CompanyMedia {
  id          String    @id @default(uuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  type        MediaType
  url         String
  filename    String
  mimeType    String
  category    String?   // produto, bastidores, loja, equipe, logo
  tags        String[]
  description String?
  metadata    Json?     // análise da IA: elementos detectados, cores dominantes etc.
  aiAnalyzed  Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([companyId])
  @@index([companyId, category])
}

enum MediaType {
  IMAGE
  VIDEO
  LOGO
}
```

### 1.2 — Estender `BrandProfile` com campos de branding visual

Adicionar ao modelo `BrandProfile` existente:

```prisma
logoUrl       String?
brandColors   String[]   // hex codes: ["#7C3AED", "#2563EB"]
visualStyle   String?    // ex: "minimalista", "vibrante", "profissional"
```

### 1.3 — Estender `Company` com relação para `CompanyMedia`

Adicionar ao modelo `Company`:

```prisma
media CompanyMedia[]
```

### 1.4 — Criar e aplicar migration

```bash
cd backend
npx prisma migrate dev --name add_company_media_and_branding
npx prisma generate
```

---

## ETAPA 2 — Storage: Suporte a Upload de Mídia da Empresa

### 2.1 — Estender `backend/src/utils/storage.ts`

Adicionar função para upload de arquivos recebidos como Buffer (multipart):

```typescript
export async function uploadCompanyMedia(
  buffer: Buffer,
  mimeType: string,
  companyId: string,
): Promise<{ publicUrl: string; filename: string }>;
```

- Gerar UUID para filename
- Salvar em `uploads/company-media/<companyId>/<uuid>.<ext>`
- Criar o diretório se não existir
- Retornar `{ publicUrl: string, filename: string }`
- Manter a mesma abstração para futura migração para S3/R2

### 2.2 — Registrar multipart no Fastify

Em `backend/src/app.ts`, registrar `@fastify/multipart` com limites seguros:

```typescript
await app.register(import("@fastify/multipart"), {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
```

Instalar dependência: `npm install @fastify/multipart`

---

## ETAPA 3 — Agent de Análise de Mídia

Criar `backend/src/agents/media.agent.ts`

Este agent usa o modelo Gemini com visão para analisar imagens e vídeos enviados pela empresa.

Interface de entrada:

```typescript
export interface MediaAnalysisInput {
  base64: string;
  mimeType: string;
  companyName: string;
  niche: string;
}
```

Interface de saída (validada com Zod):

```typescript
export interface MediaAnalysisResult {
  category: "produto" | "bastidores" | "loja" | "equipe" | "logo" | "outros";
  tags: string[]; // máx 10 tags descritivas
  description: string; // descrição objetiva em português, máx 150 chars
  detectedElements: string[]; // ex: "pizza", "forno", "chef"
  dominantColors: string[]; // hex aproximado: ["#FF5733"]
  suggestedUse: string; // ex: "post de produto", "story de bastidores"
}
```

Validar saída com Zod. Fazer parse defensivo do JSON retornado pelo Gemini (extrair de markdown se necessário, igual ao padrão de `content.agent.ts`).

---

## ETAPA 4 — Service de Mídia

Criar `backend/src/services/media.service.ts`

### 4.1 — `uploadCompanyMedia()`

```typescript
export async function uploadCompanyMedia(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string,
): Promise<CompanyMedia>;
```

- Verificar ownership: `company.userId === userId`
- Chamar `uploadCompanyMedia()` do storage
- Criar registro `CompanyMedia` no banco com `aiAnalyzed: false`
- Enfileirar job de análise de IA em background (via `mediaAnalysisQueue`)
- Retornar o objeto criado

### 4.2 — `analyzeMediaJob()`

```typescript
export async function analyzeMediaJob(
  prisma: PrismaClient,
  mediaId: string,
): Promise<void>;
```

- Ler arquivo do storage a partir da `url`
- Converter para base64
- Chamar `analyzeMedia()` do `media.agent.ts`
- Atualizar registro com `category`, `tags`, `description`, `metadata`, `aiAnalyzed: true`

### 4.3 — `listCompanyMedia()`

```typescript
export async function listCompanyMedia(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  filters?: { category?: string; type?: MediaType },
): Promise<CompanyMedia[]>;
```

- Verificar ownership
- Retornar mídias ordenadas por `createdAt DESC`

### 4.4 — `deleteCompanyMedia()`

```typescript
export async function deleteCompanyMedia(
  prisma: PrismaClient,
  mediaId: string,
  userId: string,
): Promise<void>;
```

- Verificar ownership via `media.company.userId`
- Deletar arquivo do filesystem
- Deletar registro do banco

### 4.5 — `selectMediaForPost()`

```typescript
export async function selectMediaForPost(
  prisma: PrismaClient,
  companyId: string,
  preferredCategory?: string,
): Promise<CompanyMedia | null>;
```

- Buscar mídias com `aiAnalyzed: true`
- Priorizar por `preferredCategory` se fornecido
- Retornar `null` se nenhuma mídia disponível

---

## ETAPA 5 — Fila e Worker de Análise de Mídia

### 5.1 — Criar `backend/src/queues/media.queue.ts`

```typescript
export const MEDIA_ANALYSIS_QUEUE_NAME = "media-analysis";

export interface MediaAnalysisJobPayload {
  mediaId: string;
}
```

Mesmas configurações de retry do `content.queue.ts`: 3 tentativas, backoff exponencial 5s.

### 5.2 — Criar `backend/src/workers/media.worker.ts`

```typescript
export function startMediaWorker(): Worker<MediaAnalysisJobPayload>;
```

- Concorrência: 2
- Chamar `analyzeMediaJob()` do `media.service.ts`
- Tratar erros com log e atualização de status

### 5.3 — Registrar o worker em `backend/src/worker.ts`

Importar e chamar `startMediaWorker()` junto com `startContentWorker()`.

---

## ETAPA 6 — Controller e Rotas de Mídia

### 6.1 — Criar `backend/src/controllers/media.controller.ts`

Métodos:

- `uploadMedia(request, reply)` — multipart/form-data, valida MIME type (image/\*, video/mp4), chama `media.service.uploadCompanyMedia()`
- `listMedia(request, reply)` — query params opcionais: `category`, `type`
- `deleteMedia(request, reply)` — params: `mediaId`

Tipos MIME aceitos: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`. Rejeitar outros com 400.

### 6.2 — Criar `backend/src/routes/media.routes.ts`

```
POST   /companies/:companyId/media              → upload
GET    /companies/:companyId/media              → list
DELETE /companies/:companyId/media/:mediaId     → delete
```

Todas as rotas protegidas por `auth.middleware.ts`.

Registrar em `backend/src/app.ts` junto com as outras rotas.

---

## ETAPA 7 — Estender BrandProfile: Controller + Rotas

### 7.1 — Estender `backend/src/services/company.service.ts`

Estender `updateBrandProfile()` para aceitar e persistir: `logoUrl?`, `brandColors?`, `visualStyle?`.

### 7.2 — Atualizar Zod schemas

No controller de company (`backend/src/controllers/company.controller.ts`), estender o schema de validação do `brandProfile` com os novos campos opcionais.

---

## ETAPA 8 — Integração no Pipeline de Geração de Posts

### 8.1 — Estender `ContentJobPayload` em `backend/src/queues/content.queue.ts`

Adicionar campo opcional:

```typescript
useCompanyMedia?: boolean;
```

### 8.2 — Estender `enqueueBatch()` em `backend/src/services/content.service.ts`

Implementar lógica de distribuição 70/30:

- Verificar se a empresa possui mídias com `aiAnalyzed: true`
- Se sim: 30% dos posts do lote receberão `useCompanyMedia: true` no payload
- A seleção deve ser distribuída uniformemente no lote (não os primeiros 30%)
- Se a empresa não tiver mídias, todos os posts são gerados com IA normalmente

### 8.3 — Estender `processPostContent()` em `backend/src/services/content.service.ts`

No início da função, após recuperar o AIJob:

**Se `payload.useCompanyMedia === true`:**

1. Chamar `selectMediaForPost()` passando a categoria do post idea (extraída do `contentStrategy`)
2. Se mídia encontrada:
   - Ler o arquivo como base64
   - Chamar `generateCaption()` do `content.agent.ts` com contexto adicional: `{ mediaDescription: media.description, mediaTags: media.tags }`
   - Usar o `media.url` como `mediaUrl` do Post (não gerar nova mídia)
   - Marcar `Post.status = DONE`
3. Se mídia não encontrada (fallback):
   - Continuar com o fluxo atual de geração de mídia via IA

**Se `payload.useCompanyMedia !== true`:**

- Executar o fluxo atual sem alterações.

### 8.4 — Estender `CaptionContext` em `content.agent.ts`

Adicionar campos opcionais:

```typescript
mediaDescription?: string;  // descrição da mídia selecionada
mediaTags?: string[];        // tags da mídia para enriquecer o contexto
```

Quando presentes, incluir no prompt Gemini: "A legenda deve ser baseada na seguinte imagem da empresa: [description]. Elementos: [tags]."

---

## ETAPA 9 — Frontend: Biblioteca de Mídia

### 9.1 — Criar hook `frontend/src/hooks/useMedia.ts`

Métodos:

- `useCompanyMedia(companyId, filters?)` — TanStack Query para listar mídias
- `useUploadMedia(companyId)` — mutation para upload via FormData
- `useDeleteMedia(companyId)` — mutation para deletar

### 9.2 — Estender `frontend/src/pages/settings/SettingsPage.tsx`

Adicionar duas seções novas:

**Seção: Biblioteca de Mídia**

- Grid de cards com preview das mídias (imagem ou thumbnail de vídeo)
- Badge de status: "Analisando..." ou categoria detectada pela IA
- Tags como chips
- Botão de upload com drag-and-drop
- Botão de deletar em cada card

**Seção: Perfil de Branding**

- Campos existentes: `description`, `targetAudience`, `mainProducts`, `communicationStyle`
- Novos campos: `logoUrl` (upload), `brandColors` (color picker ou input hex), `visualStyle` (select: minimalista, vibrante, profissional, elegante)

### 9.3 — Criar componente `frontend/src/components/ui/MediaUploader.tsx`

Componente reutilizável de upload:

- Aceita prop `accept` (ex: `"image/*,video/mp4"`)
- Preview inline após seleção
- Progress bar durante upload
- Limite de 50MB com mensagem de erro amigável

---

## ETAPA 10 — Validação Final

Após implementar todas as etapas:

1. Rodar `npx prisma migrate dev` e confirmar migration aplicada sem erros
2. Rodar `npx prisma generate`
3. Verificar que `tsc --noEmit` passa sem erros no backend e frontend
4. Testar manualmente o fluxo:
   - Upload de uma imagem → verificar que aparece na listagem
   - Aguardar análise da IA → verificar `aiAnalyzed: true` e metadados preenchidos
   - Acionar "gerar em lote" com mídia disponível → verificar que ~30% dos posts usam mídia
   - Verificar que posts com `useCompanyMedia: true` têm `mediaUrl` apontando para arquivo da empresa, não gerado por IA
5. Verificar que posts existentes sem `useCompanyMedia` continuam funcionando identicamente

---

## RESTRIÇÕES OBRIGATÓRIAS

- Nunca quebrar o fluxo existente de geração de posts. O campo `useCompanyMedia` é sempre opcional e tem fallback para o comportamento atual.
- Seguir a separação obrigatória: routes → controllers → services → agents
- Toda validação de entrada com Zod
- Toda operação de arquivo deve usar a abstração de `storage.ts`
- Verificar ownership em todos os endpoints (usuário só acessa mídia da própria empresa)
- Nunca expor paths absolutos do servidor em URLs públicas
- Tratar o caso de mime type inválido antes de salvar qualquer arquivo
- O worker de análise de mídia deve falhar silenciosamente (sem derrubar o worker principal)
