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

---

# 3. Público-Alvo

Pequenos negócios que precisam de presença constante no Instagram:

- Docerias
- Restaurantes
- Barbearias
- Academias
- Clínicas
- Lojas locais
- Pequenos empreendedores

---

# 4. Proposta de Valor

“Seu Instagram funcionando sozinho.”

O sistema:

- cria conteúdo
- cria imagens
- cria vídeos
- cria legenda
- cria stories
- agenda tudo automaticamente

Sem necessidade de um social media.

---

# 5. Arquitetura Geral do Sistema

Fluxo simplificado:

Usuário
↓
Frontend
↓
Backend API
↓
Fila de tarefas (Redis)
↓
Workers
↓
Serviços de IA
↓
Banco de dados
↓
Scheduler de posts

---

# 6. Stack Tecnológica

## Backend

TypeScript
Fastify
PostgreSQL
Prisma ORM
Redis + BullMQ

Workers para processamento assíncrono.

---

## Frontend

React
TypeScript
Vite
Tailwind CSS
Radix UI

Bibliotecas adicionais:

TanStack Query (requisições e cache)
Recharts (gráficos)
FullCalendar (calendário de posts)

---

## Infraestrutura

Docker
Workers separados
Sistema de filas com Redis

---

# 7. Estrutura de Filas

Redis será usado para gerenciar tarefas pesadas.

Filas implementadas:

content-generation — geração de posts (legenda, imagem, vídeo)
media-analysis — análise automática de mídias carregadas

---

# 8. Tipos de Jobs

### Planejamento de Conteúdo

generate_content_plan

Claude cria:

- ideias de posts
- calendário mensal

---

### Geração de Imagem

generate_post_image

Responsável por:

- chamar Gemini
- gerar imagens

---

### Geração de Vídeo

generate_reel_video

Responsável por:

- chamar Veo
- gerar reels

---

### Montagem de Post

assemble_post

Responsável por:

- unir mídia
- legenda
- hashtags
- metadados

---

### Agendamento

schedule_post

Responsável por:

- preparar postagem
- enviar para Instagram

---

# 9. Estrutura do Banco de Dados

## Tabela Users

id, email, password, name, isActive, createdAt, updatedAt

---

## Tabela Companies

id, userId, name, niche, description, city, tone, postingFrequency, createdAt, updatedAt

---

## Tabela BrandProfile

id, companyId, description, targetAudience, mainProducts, communicationStyle, logoUrl, brandColors, visualStyle, createdAt, updatedAt

---

## Tabela ContentStrategy

id, companyId, content (JSON), approvalStatus, approvedAt, rejectedAt, rejectionReason, createdAt, updatedAt

---

## Tabela ContentCalendar

id, companyId, date, type, status, postIdeaIndex, createdAt

---

## Tabela Posts

id, companyId, calendarId, type, caption, hashtags, mediaUrl, status, scheduledAt, publishedAt, createdAt, updatedAt

---

## Tabela AIJob

id, companyId, type, status, payload (JSON), result (JSON), error, createdAt, updatedAt

---

## Tabela CompanyMedia

id, companyId, type (IMAGE/VIDEO/LOGO), url, filename, mimeType, category, tags, description, metadata (JSON), aiAnalyzed, isActive, createdAt, updatedAt
payload
created_at

---

# 10. Estrutura do Backend

backend/

api/
routes.py

agents/
claude_agent.py

services/
content_service.py
image_service.py
video_service.py

workers/
worker_content.py
worker_images.py
worker_video.py

models/
company.py
post.py
content.py

scheduler/
post_scheduler.py

---

# 11. Estrutura do Frontend

src/

components/
dashboard
calendar
post-preview
analytics

pages/
dashboard
content
calendar
settings

services/
api.ts

hooks/

types/
company.ts
post.ts
content.ts

utils/

---

# 12. Identidade Visual

Conceito:

Tecnologia + Automação + Crescimento.

---

## Paleta de Cores

Primary
#7C3AED

Secondary
#2563EB

Accent
#F97316

Background
#0F172A

Text
#E5E7EB

---

## Estilo Visual

Interface minimalista
Estilo moderno de SaaS
Cards com sombras leves
Uso de gradientes roxo/azul

---

## Tipografia

Inter (principal)

---

# 13. Fluxo de Uso do Usuário

1. Usuário cria conta
2. Usuário cadastra empresa
3. Usuário define perfil de marca
4. Claude gera planejamento de conteúdo
5. Sistema gera posts
6. Sistema gera imagens
7. Sistema gera reels
8. Sistema monta posts
9. Sistema agenda publicações

---

# 14. Motor de Conteúdo Multiformato

Cada ideia gera vários formatos:

Post
Reel
Stories

Exemplo:

Ideia: Promoção de cocadas

Post → imagem + legenda
Reel → vídeo + roteiro
Stories → sequência interativa

---

# 15. Estratégia de Monetização

Plano Básico

12 posts por mês
imagens geradas
legendagens automáticas

---

Plano Pro

30 posts
reels automáticos
stories
calendário automático

---

Plano Business

posts ilimitados
múltiplas contas
analytics avançado

---

# 16. Fases de Desenvolvimento

## Fase 1 — Estrutura Base

Objetivo: preparar fundação do sistema.

Implementar:

- estrutura do backend
- banco de dados
- autenticação
- cadastro de empresa
- cadastro de perfil de marca

---

## Fase 2 — Motor de Planejamento

Implementar:

integração com Claude
geração de ideias de conteúdo
geração de calendário editorial

Salvar ideias no banco.

---

## Fase 3 — Geração de Conteúdo

Implementar:

geração de legendas
geração de hashtags
estruturação de posts

---

## Fase 4 — Geração de Imagens

Implementar:

integração com Gemini
geração de imagens para posts
geração de imagens para stories

---

## Fase 5 — Sistema de Filas

Implementar:

Redis
workers
fila de tarefas

Mover geração de conteúdo para jobs.

---

## Fase 6 — Geração de Vídeos

Implementar:

integração com Veo
geração automática de reels
armazenamento de vídeos

---

## Fase 7 — Montagem de Conteúdo

Implementar:

pipeline de criação:

idea
↓
media
↓
caption
↓
post_ready

---

## Fase 8 — Dashboard

Implementar frontend:

painel de conteúdo
preview de posts
calendário editorial

---

## Fase 9 — Agendamento

Implementar:

scheduler
fila de publicação
integração com Instagram

---

## Fase 10 — Analytics

Implementar:

métricas de posts
engajamento
desempenho de conteúdo

---

# 17. Versão MVP

Para validar o produto rapidamente, o MVP deve incluir:

cadastro de empresa
perfil de marca
geração de ideias de conteúdo
geração de imagens
geração de legendas
calendário de posts
download do conteúdo

Sem automação de postagem inicialmente.

---

# 18. Visão de Longo Prazo

Transformar o sistema em:

Agente de Marketing Autônomo para Pequenos Negócios.

Possíveis evoluções:

resposta automática a comentários
geração automática de promoções
análise de performance
otimização automática de conteúdo
integração com WhatsApp

---

# 19. Nome do Produto (placeholder)

Sugestões possíveis:

PostPilot
AutoPost AI
SocialBrain
ContentFlow
PostForge

O nome definitivo pode ser definido posteriormente.

---

# 20. Objetivo Final

Criar um sistema que permita que qualquer pequeno negócio tenha:

conteúdo constante
qualidade visual profissional
estratégia de marketing
presença digital ativa

Sem precisar contratar um social media.
