# Projeto: SaaS de Automação de Conteúdo para Instagram com IA

## 1. Visão Geral do Produto

Sistema SaaS que automatiza completamente a criação e gestão de conteúdo para Instagram de pequenos negócios.

A plataforma funciona como um **agente de marketing autônomo**, capaz de:

- Planejar conteúdo automaticamente
- Gerar imagens
- Gerar vídeos (reels)
- Criar legendas e hashtags
- Gerar stories
- Montar calendário de posts
- Agendar publicações
- Manter consistência de marca

O objetivo é permitir que empresas configurem o sistema **uma única vez**, e depois tenham seu Instagram funcionando praticamente em piloto automático.

---

# 2. Conceito Central do Produto

O sistema funciona como um **orquestrador de inteligências artificiais**.

Cada IA terá uma função específica dentro da arquitetura.

## Papel das IAs

### Gemini

Responsável por:

- Planejamento e estratégia de conteúdo (`claude.agent.ts`)
- Criação de legendas e hashtags (`content.agent.ts`)
- Geração de imagens via Gemini Imagen (`image.adapter.ts`)
- Análise e categorização de mídias carregadas (`media.agent.ts`)

Gemini atua como **o cérebro do sistema**.

---

### Veo

Responsável por:

- Geração de vídeos
- Criação de reels

---

### Backend

Responsável por:

- Orquestrar todas as IAs
- Gerenciar filas (BullMQ + Redis)
- Persistir dados (PostgreSQL + Prisma)
- Controlar agendamentos
- Gerenciar contas de usuários
