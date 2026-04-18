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

# Fase 8 — Biblioteca de Mídias ✅ COMPLETO

Objetivo: permitir que empresas façam upload e gestão de mídias próprias para uso na geração de conteúdo.

### Backend

- Upload de imagens e vídeos por empresa (`POST /companies/:companyId/media`) ✓
- Análise automática de mídias via Gemini ao fazer upload ✓
  - Extrai: `category`, `tags`, `description`, `detectedElements`, `dominantColors`, `suggestedUse`
  - Promove tipo para `LOGO` se categoria detectada = `logo`
- Fila dedicada `media-analysis` (BullMQ) com worker separado ✓
- Rate limiting do worker: 1 req/15 s, backoff exponencial 60 s, 5 tentativas ✓
- Listagem com filtros por `category` e `type` ✓
- Toggle de ativação de mídia (`isActive`) ✓
- Exclusão de mídia (arquivo + registro) ✓
- Endpoint de re-enfileiramento de mídias com análise pendente (`POST /companies/:companyId/media/requeue`) ✓
- Sérvia de arquivos via `/media/company-media/*` ✓

### Frontend

- Página Biblioteca de Mídia (`/media`) ✓
- Upload com drag-and-drop (componente `MediaUploader`) ✓
- Cards de mídia com badge de status (Analisando / categoria / inativa) ✓
- Polling automático de 3 s enquanto houver mídias pendentes ✓
- Filtros por tipo e status ✓
- Acões por card: ativar/desativar, deletar ✓
- Botão “Re-analisar falhas” (visível somente quando `hasPending = true`) ✓
- Toast de feedback ao re-enfileirar (sem `alert()`) ✓

---

# Fase 9 — Automação Completa ✅ COMPLETO

Objetivo: ciclo autônomo semanal de geração de conteúdo com notificações em tempo real.

### Backend

- `AutomationConfig` model no banco (habilitação, horário, threshold de posts pending) ✓
- `Notification` model no banco com enum `NotificationType` ✓
- Fila `automation` (BullMQ) via `automation.queue.ts` ✓
- Automation Worker (`automation.worker.ts`) — concorrência 1 ✓
  - job recorrente registrado no cron `0 3 * * *` (03:00 UTC) com `jobId` idempotente ✓
  - `runAutomationCycle`: itera empresas com `automationEnabled: true`, verifica threshold de posts pendentes, enfileira geração de calendário + posts ✓
  - isolamento de erros por empresa (falha em uma não bloqueia as demais) ✓
- `notification.service.ts` — criação, listagem, markAsRead (com ownership check), markAllAsRead, countUnread ✓
- `automation.service.ts` — runAutomationCycle, getAutomationConfig (upsert com defaults), updateAutomationConfig ✓
- `content.worker.ts` — cria notificação `CONTENT_READY` após geração bem-sucedida de cada post ✓
- 7 novos endpoints:
  - `GET /api/notifications` — listar notificações do usuário ✓
  - `GET /api/notifications/unread-count` — contagem de não lidas ✓
  - `POST /api/notifications/:id/read` — marcar uma como lida ✓
  - `POST /api/notifications/read-all` — marcar todas como lidas ✓
  - `GET /api/automation/config` — buscar configuração de automação da empresa ✓
  - `PUT /api/automation/config` — atualizar configuração de automação ✓
  - `POST /api/automation/trigger` — disparar ciclo manualmente ✓

### Frontend

- `useNotifications` hook — polling 30 s, markAsRead, markAllAsRead ✓
- `useUnreadCount` hook — polling inteligente (15 s quando há não lidas, 30 s contrário) ✓
- `useAutomation` hook — getConfig, updateConfig, triggerAutomation (com invalidação de calendar/posts/notifications) ✓
- Componente `NotificationBell` — badge com contagem, dropdown, marca todas como lidas ao abrir ✓
- Componente `NotificationPanel` — lista com ícones/cores por tipo, estados de loading e vazio ✓
- `NotificationBell` integrado na Sidebar ✓
- Seção Automação na `SettingsPage` — toggles (habilitado, calendário auto, posts auto), threshold, botão salvar, botão disparar ciclo manual ✓

---

# Fase 10 — MVP ✅ COMPLETO

Primeira versão comercial FINALIZADA.

Funcionalidades entregues:

- Cadastro de empresa
- Geração automática de posts
- Download de conteúdo
- Calendário

Todos os requisitos do MVP foram implementados e estão disponíveis no sistema.

---

# Fase 11 — Escala

Melhorias:

- múltiplos workers
- analytics
- integração com Instagram Graph API (agendamento automático)
- suporte a TikTok, LinkedIn
