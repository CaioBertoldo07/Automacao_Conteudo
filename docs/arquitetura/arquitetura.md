# Arquitetura do Sistema — Gerador Automático de Conteúdo para Instagram

## Visão Geral

Este projeto é um **Micro SaaS de automação de conteúdo para Instagram**, onde empresas cadastram suas informações e o sistema gera automaticamente:

- Posts (imagem + legenda + hashtags)
- Reels (vídeo + legenda)
- Stories (imagem + legenda)
- Agenda de postagens

Tudo de forma automatizada utilizando múltiplas IAs.

---

# Stack Tecnológica

## Backend

- **TypeScript**
- **Fastify** (framework HTTP)
- PostgreSQL
- Prisma ORM
- Redis + BullMQ (fila de jobs e workers)

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Radix UI
- TanStack Query
- FullCalendar
- Recharts

## IA

- **Gemini** → estratégia de conteúdo, legendas e imagens
- **Veo 3** → geração de vídeos para Reels

---

# Arquitetura Geral

```
Frontend (React + Vite)
        ↓
API Backend (Fastify — TypeScript)
        ↓
BullMQ Queue (Redis)
      ↙       ↘
Content Worker   Media Worker   Automation Worker
(concorrência 3) (concorrência 1) (concorrência 1, cron 03:00)
        ↓
APIs externas (Gemini / Veo 3)
        ↓
Armazenamento local (/uploads)
```

---

# Fluxo de Funcionamento

1. Usuário cadastra empresa e perfil de marca
2. Sistema gera estratégia de conteúdo via Gemini
3. Usuário aprova a estratégia
4. Sistema cria calendário de posts baseado na estratégia
5. Usuário aciona geração de um post do calendário (manual ou automático)
6. API cria AIJob (PENDING) e enfileira no BullMQ
7. Content Worker consome o job:
   - Gemini gera legenda e hashtags
   - Gemini e/ou Veo gera mídia (imagem ou vídeo)
   - Arquivo salvo em `/uploads`, URL pública via `/media/:filename`
   - Post atualizado como DONE no banco
   - Notificação `CONTENT_READY` criada no banco
8. Conteúdo aparece no dashboard/calendário
9. (Automático) Automation Worker executa diariamente às 03:00 UTC:
   - Itera empresas com `automationEnabled: true`
   - Verifica threshold de posts pendentes
   - Enfileira geração de calendário e posts automaticamente
   - Notificação `AUTOMATION_COMPLETE` criada ao final

---

# Componentes Principais

## Frontend

Responsável por:

- Autenticação (login/registro)
- Cadastro e edição de empresa
- Visualização e aprovação da estratégia
- Calendário de conteúdo (FullCalendar)
- Geração e visualização de posts
- Download de mídia gerada
- Sino de notificações (`NotificationBell`) com badge e painel de listagem
- Configuração de automação (toggles, threshold, disparo manual) na SettingsPage

---

## Backend API (Fastify)

Rotas `/api/*`:

- `/api/auth` — registro e login JWT
- `/api/user` — perfil do usuário
- `/api/company` — CRUD de empresa e perfil de marca
- `/api/strategy` — geração e aprovação de estratégia
- `/api/calendar` — geração e listagem de calendário
- `/api/content` — enfileiramento e status de geração
- `/api/companies/:companyId/media` — upload, listagem, toggle e exclusão de mídias da empresa
- `/api/companies/:companyId/media/requeue` — re-enfileirar mídias com análise pendente
- `/api/notifications` — listagem, contagem de não lidas, marcar como lida
- `/api/automation` — configuração de automação e disparo manual do ciclo

Rota estática:

- `/media/*` — serve arquivos gerados e mídias carregadas localmente (protegido contra path traversal)

---

## Content Worker (BullMQ)

Arquivo: `src/worker.ts` / `src/workers/content.worker.ts`

Responsável por:

- consumir jobs da fila `content-generation`
- gerar legenda e hashtags via Gemini (`content.agent.ts`)
- gerar imagem via Gemini Imagen (`image.adapter.ts`)
- gerar vídeo via Veo 3 (`video.adapter.ts`)
- salvar mídia no filesystem (`utils/storage.ts`)
- atualizar AIJob e Post no banco
- criar notificação `CONTENT_READY` no banco após geração bem-sucedida

Configuração: concorrência 3, retry automático exponencial (3 tentativas).

---

## Media Worker (BullMQ)

Arquivo: `src/worker.ts` / `src/workers/media.worker.ts`

Responsável por:

- consumir jobs da fila `media-analysis`
- ler arquivo do disco, converter para base64
- chamar Gemini via `media.agent.ts` para análise da imagem
- extrair `category`, `tags`, `description`, `detectedElements`, `dominantColors`, `suggestedUse`
- atualizar `CompanyMedia` no banco com `aiAnalyzed: true`
- se categoria = `logo`, promover tipo para `LOGO`

Configuração: concorrência 1, backoff exponencial 60 s com 5 tentativas.

---

## Automation Worker (BullMQ)

Arquivo: `src/worker.ts` / `src/workers/automation.worker.ts`

Responsável por:

- consumir jobs da fila `automation`
- executar `runAutomationCycle` do `automation.service.ts`
- iterar todas as empresas com `automationEnabled: true`
- verificar threshold de posts pendentes antes de gerar
- enfileirar geração de calendário e conteúdo para cada empresa elegível
- isolar falhas por empresa (uma empresa falhando não bloqueia as demais)

Configuração: concorrência 1, job recorrente cron `0 3 * * *` (03:00 UTC) com `jobId` idempotente.

---

## Agents de IA

```
agents/
    claude.agent.ts    ← geração de estratégia via Gemini
    content.agent.ts   ← geração de legenda e hashtags via Gemini
    image.adapter.ts   ← geração de imagem via Gemini Imagen
    video.adapter.ts   ← geração de vídeo via Veo 3 (REST API)
    media.agent.ts     ← análise de mídias carregadas via Gemini (categorização, tags, descrição)
```

---

## Redis / BullMQ Queue

```
queues/
    content.queue.ts    ← define fila "content-generation"
    media.queue.ts      ← define fila "media-analysis"
    automation.queue.ts ← define fila "automation" (job recorrente diário 03:00 UTC)
```

Configuração da fila `content-generation`:

- 3 tentativas com backoff exponencial (5 s inicial)
- Limpa jobs concluídos (manter últimos 100)
- Limpa jobs com falha (manter últimos 200)

Configuração da fila `media-analysis`:

- 5 tentativas com backoff exponencial (60 s inicial → 60 s, 120 s, 240 s, 480 s, 960 s)
- Limpa jobs concluídos (manter últimos 100)
- Limpa jobs com falha (manter últimos 200)

Configuração da fila `automation`:

- job recorrente com cron `0 3 * * *`, `jobId: "daily-automation"` (idempotente)
- 3 tentativas com backoff exponencial (5 s inicial)
- Limpa jobs concluídos (manter últimos 50)

---

# Tipos de Conteúdo Gerado

## Post de Imagem (IMAGE)

- legenda em português
- hashtags otimizados
- imagem gerada via Gemini Imagen (1:1)

## Reel (REEL)

- legenda em português
- hashtags otimizados
- imagem-chave gerada via Gemini (9:16)
- vídeo gerado via Veo 3 (8 s, 9:16) — com fallback para imagem se timeout

## Story (STORY)

- legenda em português
- hashtags otimizados
- imagem gerada via Gemini (9:16)

---

# Armazenamento de Mídia

**Fase atual:** filesystem local em `/uploads/`

Dois tipos de arquivos:

- **Conteúdo gerado**: `uploads/<uuid>.<ext>` — gerado pelos workers de conteúdo
- **Mídias carregadas**: `uploads/company-media/<companyId>/<uuid>.<ext>` — carregadas pelo usuário via painel

Fluxo conteúdo gerado: `base64 → uploadMedia() → /uploads/<uuid>.<ext> → /media/<filename>`

Fluxo mídia carregada: `multipart upload → /uploads/company-media/<companyId>/<uuid>.<ext> → /media/company-media/...`

**Futuro:** trocar `uploadMedia()` por implementação S3/R2/GCS sem alterar nenhum outro arquivo.

---

# Segurança

- autenticação JWT (access token com expiração configurável)
- senhas com bcrypt
- validação de entrada com Zod nas fronteiras da API
- proteção contra path traversal na rota `/media/:filename`
- ownership check em todos endpoints de empresa/conteúdo

---

# Escalabilidade

Estratégia atual e futura:

- workers horizontais (múltiplas instâncias do `worker.ts`)
- fila distribuída com Redis
- concorrência configurável por worker
- troca de armazenamento local por object storage sem mudança de interface

---

# Futuras Expansões

- integração direta com Instagram Graph API (agendamento automático)
- TikTok, LinkedIn
- analytics de desempenho
- múltiplas empresas por usuário
