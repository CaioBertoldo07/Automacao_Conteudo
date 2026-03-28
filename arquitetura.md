# Arquitetura do Sistema — Gerador Automático de Conteúdo para Instagram

## Visão Geral

Este projeto é um **Micro SaaS de automação de conteúdo para Instagram**, onde empresas cadastram suas informações e o sistema gera automaticamente:

* Posts
* Reels
* Imagens
* Copies
* Agenda de postagens

Tudo de forma automatizada utilizando múltiplas IAs.

---

# Stack Tecnológica

## Backend

* Python
* FastAPI
* PostgreSQL
* Prisma ORM
* Redis (fila de jobs)

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* Shadcn UI

## IA

Claude → cérebro do sistema
Gemini (Nano Banana) → geração de imagens
Veo → geração de vídeos

---

# Arquitetura Geral

Frontend (React + Vite)
↓
API Backend (FastAPI)
↓
Fila de Jobs (Redis)
↓
Workers de IA
↓
APIs externas (Claude / Gemini / Veo)

---

# Fluxo de Funcionamento

1. Usuário cadastra empresa
2. Sistema gera estratégia de conteúdo
3. Sistema cria calendário de posts
4. Jobs são enviados para fila
5. Workers executam geração de conteúdo
6. Conteúdo é salvo no banco
7. Conteúdo aparece no dashboard

---

# Componentes Principais

## Frontend

Responsável por:

* Dashboard
* Cadastro de empresa
* Visualização de posts
* Calendário de conteúdo
* Analytics

---

## Backend API

Responsável por:

* autenticação
* CRUD de empresas
* gerenciamento de posts
* disparo de jobs
* integração com IA

---

## Worker de IA

Responsável por:

* gerar prompts
* chamar APIs de IA
* salvar resultados

---

## Redis Queue

Responsável por:

* gerenciar fila de jobs
* evitar sobrecarga nas APIs
* processar tarefas em background

---

# Tipos de Conteúdo Gerado

## Post de imagem

* imagem
* copy
* hashtags

## Reel

* roteiro
* vídeo
* legenda

## Story

* texto curto
* imagem

---

# Automação

O sistema deve:

* gerar calendário semanal
* gerar conteúdo automaticamente
* enviar para aprovação
* permitir download ou postagem automática

---

# Escalabilidade

Estratégia:

* workers horizontais
* fila distribuída
* cache em Redis
* processamento assíncrono

---

# Segurança

* autenticação JWT
* criptografia de tokens
* rate limit nas APIs
* logs de execução

---

# Futuras Expansões

* TikTok
* LinkedIn
* Twitter
* agendamento automático
* analytics avançado
