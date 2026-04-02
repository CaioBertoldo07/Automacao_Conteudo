# Roadmap de Desenvolvimento

## Fase 1 — Fundação do Projeto ✅ COMPLETO

Objetivo: criar base do sistema.

### Backend

- ~~criar projeto FastAPI~~ → **Fastify + TypeScript**
- configurar PostgreSQL ✓
- configurar Prisma ✓
- criar autenticação JWT ✓
- criar CRUD de usuários ✓

### Frontend

- iniciar projeto React com Vite ✓
- configurar TypeScript ✓
- configurar Tailwind ✓
- criar layout base ✓

---

# Fase 2 — Sistema de Empresas ✅ COMPLETO

Objetivo: permitir cadastro de empresas.

### Backend

- CRUD de empresas ✓
- CRUD de perfil de marca (BrandProfile) ✓

### Frontend

- tela de cadastro de empresa ✓
- edição de empresa ✓
- dashboard inicial ✓

---

# Fase 3 — Estratégia de Conteúdo com IA ✅ COMPLETO

Objetivo: gerar estratégia automática.

### Backend

- ~~integração com Claude~~ → **integração com Gemini** ✓
- geração de estratégia de conteúdo via `claude.agent.ts` (Gemini) ✓
- salvar estratégia no banco (modelo ContentStrategy) ✓
- fluxo de aprovação/rejeição de estratégia ✓

### Frontend

- visualização da estratégia ✓
- aprovação/rejeição da estratégia ✓

---

# Fase 4 — Calendário de Conteúdo ✅ COMPLETO

Objetivo: gerar agenda automática.

### Backend

- geração de calendário com base na estratégia aprovada ✓
- entradas de ContentCalendar com postIdeaIndex ✓

### Frontend

- tela de calendário (FullCalendar) ✓
- visualização dos posts agendados ✓

---

# Fase 5 — Geração de Conteúdo ✅ COMPLETO

Objetivo: gerar posts reais.

### Backend

Workers geram:

- Imagem → Gemini Imagen (`image.adapter.ts`) ✓
- Vídeo → Veo 3 com fallback para imagem (`video.adapter.ts`) ✓
- Legenda + Hashtags → Gemini (`content.agent.ts`) ✓

Mídia salva localmente em `/uploads/` e servida via `/media/:filename` ✓

### Frontend

- visualização de mídia gerada (MediaViewer) ✓
- download de conteúdo ✓

---

# Fase 6 — Sistema de Filas ✅ COMPLETO

Objetivo: processamento escalável.

- BullMQ queue (`content.queue.ts`) ✓
- Content worker com concorrência 3 (`content.worker.ts`) ✓
- Redis como broker ✓
- Retry automático exponencial (3 tentativas) ✓
- Atomic claim para evitar processamento duplicado ✓
- Rollback transacional em caso de falha na fila ✓

---

# Fase 7 — Dashboard ✅ COMPLETO

Mostrar:

- cards de stats no dashboard (posts gerados, calendário, downloads, jobs ativos) ✓
- polling automático de stats (5 s ativo / 20 s idle) ✓
- ContentPage — lista de posts com filtros, paginação e visualização de mídia ✓
- CalendarPage — FullCalendar, geração individual e em batch ✓
- download de mídia gerada ✓
- SettingsPage — edição de perfil (nome/e-mail) e troca de senha ✓

---

# Fase 8 — Automação Completa

Sistema deve:

- gerar conteúdo semanal automaticamente
- atualizar calendário
- enviar notificações de conclusão

---

# Fase 9 — MVP

Primeira versão comercial:

Funcionalidades:

- cadastro de empresa
- geração automática de posts
- download de conteúdo
- calendário

---

# Fase 10 — Escala

Melhorias:

- múltiplos workers
- analytics
- integração com Instagram Graph API (agendamento automático)
- suporte a TikTok, LinkedIn
