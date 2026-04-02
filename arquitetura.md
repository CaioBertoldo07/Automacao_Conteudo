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
        ↓
Content Worker (concorrência 3)
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
5. Usuário aciona geração de um post do calendário
6. API cria AIJob (PENDING) e enfileira no BullMQ
7. Content Worker consome o job:
   - Gemini gera legenda e hashtags
   - Gemini e/ou Veo gera mídia (imagem ou vídeo)
   - Arquivo salvo em `/uploads`, URL pública via `/media/:filename`
   - Post atualizado como DONE no banco
8. Conteúdo aparece no dashboard/calendário

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

---

## Backend API (Fastify)

Rotas `/api/*`:

- `/api/auth` — registro e login JWT
- `/api/user` — perfil do usuário
- `/api/company` — CRUD de empresa e perfil de marca
- `/api/strategy` — geração e aprovação de estratégia
- `/api/calendar` — geração e listagem de calendário
- `/api/content` — enfileiramento e status de geração

Rota estática:

- `/media/:filename` — serve arquivos gerados localmente

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

Configuração: concorrência 3, retry automático exponencial (3 tentativas).

---

## Agents de IA

```
agents/
    claude.agent.ts    ← geração de estratégia via Gemini
    content.agent.ts   ← geração de legenda e hashtags via Gemini
    image.adapter.ts   ← geração de imagem via Gemini Imagen
    video.adapter.ts   ← geração de vídeo via Veo 3 (REST API)
```

---

## Redis / BullMQ Queue

```
queues/
    content.queue.ts   ← define fila "content-generation"
```

Configuração da fila:

- 3 tentativas com backoff exponencial (5 s inicial)
- Limpa jobs concluídos (manter últimos 100)
- Limpa jobs com falha (manter últimos 200)

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

Fluxo: `base64 → uploadMedia() → /uploads/<uuid>.<ext> → /media/<filename>`

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
- notificações de conclusão de jobs
