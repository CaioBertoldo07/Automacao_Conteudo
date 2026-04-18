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
