# Fase 9 — Automação Completa

Implemente a Fase 9 deste projeto seguindo rigorosamente a arquitetura e convenções
descritas em `CLAUDE.md`, `arquitetura.md`, `banco.md` e `desenvolvimento.md`.

Leia esses arquivos antes de qualquer implementação.

---

## Objetivo

Tornar o sistema autônomo: gerar conteúdo automaticamente sem intervenção manual,
recompondo o calendário quando estiver próximo de esgotar, e notificando o usuário
ao término de cada geração.

---

## Skills obrigatórias

Antes de implementar cada etapa, carregue a skill correspondente:

- **`prisma-migration`** → para os novos modelos Prisma
- **`new-worker`** → para o automation.worker.ts com repeatable job
- **`new-endpoint`** → para cada par de rota/controller/service novo
- **`frontend-feature`** → para as novas páginas e hooks

---

## O que implementar

### Etapa 1 — Banco de dados

**Leia a skill `prisma-migration` antes de alterar o schema.**

Adicionar em `backend/prisma/schema.prisma`:

```prisma
enum NotificationType {
  CONTENT_READY
  CALENDAR_UPDATED
  AUTOMATION_ERROR
}

model Notification {
  id        String           @id @default(uuid())
  type      NotificationType
  title     String
  message   String
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  companyId String?
  company   Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
}

model AutomationConfig {
  id                       String   @id @default(uuid())
  enabled                  Boolean  @default(false)
  autoGenerateContent      Boolean  @default(true)
  autoRefillCalendar       Boolean  @default(true)
  calendarRefillThreshold  Int      @default(7)  // dias restantes antes de regenerar
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  companyId String  @unique
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

Adicionar relações inversas em `User` e `Company`:

```prisma
// em User:
notifications Notification[]

// em Company:
notifications    Notification[]
automationConfig AutomationConfig?
```

Executar:

```bash
cd backend
npx prisma migrate dev --name add_notifications_and_automation_config
```

---

### Etapa 2 — Fila de automação

**Leia a skill `new-worker` antes de criar estes arquivos.**

**2a. `backend/src/queues/automation.queue.ts`**

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const AUTOMATION_QUEUE_NAME = "automation";

export interface AutomationJobPayload {
  type: "CHECK_ALL_COMPANIES"; // extensível para outros tipos futuros
}

export const automationQueue = new Queue<AutomationJobPayload>(
  AUTOMATION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  },
);
```

**2b. `backend/src/workers/automation.worker.ts`**

```typescript
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { redisConnection } from "../config/redis";
import {
  AUTOMATION_QUEUE_NAME,
  type AutomationJobPayload,
} from "../queues/automation.queue";
import { runAutomationCycle } from "../services/automation.service";

export function startAutomationWorker(): Worker<AutomationJobPayload> {
  const prisma = new PrismaClient();

  const worker = new Worker<AutomationJobPayload>(
    AUTOMATION_QUEUE_NAME,
    async (job) => {
      console.log(
        `[AutomationWorker] Ciclo de automação iniciado — job ${job.id}`,
      );
      await runAutomationCycle(prisma);
    },
    {
      connection: redisConnection,
      concurrency: 1, // apenas um ciclo de automação por vez
    },
  );

  worker.on("completed", (job) => {
    console.log(`[AutomationWorker] ✓ Ciclo concluído — job ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[AutomationWorker] ✗ Ciclo falhou (job ${job?.id}): ${err.message}`,
    );
  });

  worker.on("error", (err) => {
    console.error("[AutomationWorker] Erro:", err.message);
  });

  process.on("SIGTERM", async () => {
    await worker.close();
    await prisma.$disconnect();
  });

  return worker;
}
```

**2c. Registrar em `backend/src/worker.ts`**

```typescript
import { startAutomationWorker } from "./workers/automation.worker";
import { automationQueue } from "./queues/automation.queue";

// Adicionar ao final do arquivo:
const automationWorker = startAutomationWorker();
console.log("[Worker] automation worker iniciado (concurrency=1)");

// Agendar repeatable job diário às 03:00
automationQueue.add(
  "daily-automation-check",
  { type: "CHECK_ALL_COMPANIES" },
  {
    repeat: { pattern: "0 3 * * *" }, // todo dia às 03:00
    jobId: "daily-automation-check", // idempotente: não duplica ao reiniciar
  },
);
```

---

### Etapa 3 — Services

**3a. `backend/src/services/notification.service.ts`**

Funções necessárias:

- `createNotification(prisma, { userId, companyId?, type, title, message })` — cria notificação
- `listNotifications(prisma, userId)` — lista todas, ordenadas por `createdAt desc`, máx 50
- `markAsRead(prisma, notificationId, userId)` — marca como lida; verificar ownership (userId)
- `markAllAsRead(prisma, userId)` — marca todas como lidas
- `countUnread(prisma, userId)` — retorna número de não-lidas (usado pelo frontend para badge)

**3b. `backend/src/services/automation.service.ts`**

Função principal: `runAutomationCycle(prisma: PrismaClient)`

Lógica por empresa:

1. Buscar todas as `Company` com `automationConfig.enabled = true`
2. Para cada empresa:
   a. **Auto-refill do calendário**: se `autoRefillCalendar = true`, contar entradas `PENDING`
   nos próximos `calendarRefillThreshold` dias. Se < 3 entradas, chamar
   `generateCalendar(prisma, company.userId)` e criar notificação `CALENDAR_UPDATED`.
   b. **Auto-geração de conteúdo**: se `autoGenerateContent = true`, buscar entradas `PENDING`
   com `date <= agora + 24h`. Para cada uma, chamar `enqueuePostContent(prisma, userId, entryId)`.
3. Erros por empresa devem ser isolados — um erro não deve parar o processamento das demais.
   Logar o erro e criar notificação `AUTOMATION_ERROR`.

Funções adicionais:

- `getAutomationConfig(prisma, companyId, userId)` — retorna config, cria com defaults se não existir
- `updateAutomationConfig(prisma, companyId, userId, data)` — atualiza config; verificar ownership

**3c. Atualizar `backend/src/workers/content.worker.ts`**

Após `processPostContent` bem-sucedido, criar notificação `CONTENT_READY`:

```typescript
// Dentro do handler do worker, após processPostContent:
const prisma = new PrismaClient(); // já existe no escopo
await createNotification(prisma, {
  userId,
  companyId: job.data.companyId, // adicionar companyId ao ContentJobPayload
  type: "CONTENT_READY",
  title: "Conteúdo gerado!",
  message: "Um novo post foi gerado e está pronto para download.",
});
```

Isso exige adicionar `companyId` ao `ContentJobPayload` em `content.queue.ts` e ao ponto de
enfileiramento em `content.service.ts`.

---

### Etapa 4 — Endpoints

**Leia a skill `new-endpoint` antes de criar cada par rota/controller/service.**

**4a. Rotas de notificação**

`backend/src/routes/notification.routes.ts`

```
GET  /notifications         → lista notificações do usuário autenticado
PATCH /notifications/read-all → marca todas como lidas
PATCH /notifications/:id/read → marca uma como lida
GET  /notifications/unread-count → retorna { count: number }
```

Todas as rotas exigem `authMiddleware`.

**4b. Rotas de automação**

`backend/src/routes/automation.routes.ts`

```
GET   /automation/config    → retorna (ou cria com defaults) AutomationConfig da empresa do usuário
PATCH /automation/config    → atualiza AutomationConfig
POST  /automation/trigger   → dispara ciclo manualmente (útil para testes / admin)
```

Todas exigem `authMiddleware`.

Schema Zod para PATCH:

```typescript
z.object({
  enabled: z.boolean().optional(),
  autoGenerateContent: z.boolean().optional(),
  autoRefillCalendar: z.boolean().optional(),
  calendarRefillThreshold: z.number().int().min(1).max(30).optional(),
});
```

**4c. Registrar em `app.ts`**

```typescript
fastify.register(notificationRoutes, { prefix: "/api", prisma });
fastify.register(automationRoutes, { prefix: "/api", prisma });
```

---

### Etapa 5 — Frontend

**Leia a skill `frontend-feature` antes de criar cada feature.**

**5a. Tipos em `frontend/src/types/index.ts`**

```typescript
export type NotificationType =
  | "CONTENT_READY"
  | "CALENDAR_UPDATED"
  | "AUTOMATION_ERROR";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  companyId: string | null;
  createdAt: string;
}

export interface AutomationConfig {
  id: string;
  companyId: string;
  enabled: boolean;
  autoGenerateContent: boolean;
  autoRefillCalendar: boolean;
  calendarRefillThreshold: number;
  createdAt: string;
  updatedAt: string;
}
```

**5b. Services em `frontend/src/services/api.ts`**

`notificationService`:

- `list()` → `GET /notifications`
- `markRead(id)` → `PATCH /notifications/:id/read`
- `markAllRead()` → `PATCH /notifications/read-all`
- `unreadCount()` → `GET /notifications/unread-count` → `{ count: number }`

`automationService`:

- `getConfig()` → `GET /automation/config`
- `updateConfig(data)` → `PATCH /automation/config`
- `trigger()` → `POST /automation/trigger`

**5c. Hooks em `frontend/src/hooks/`**

`useNotifications.ts`:

- `useNotifications()` — `useQuery`, poll a cada 30s, invalida cache ao marcar como lida
- `useMarkRead()` — `useMutation`, `PATCH /notifications/:id/read`
- `useMarkAllRead()` — `useMutation`, `PATCH /notifications/read-all`
- `useUnreadCount()` — `useQuery`, poll a cada 15s enquanto há não-lidas

`useAutomation.ts`:

- `useAutomationConfig()` — `useQuery`
- `useUpdateAutomationConfig()` — `useMutation`, invalida config ao salvar
- `useTriggerAutomation()` — `useMutation`

**5d. Componente `NotificationBell`**

`frontend/src/components/ui/NotificationBell.tsx`

- Badge numérico com contagem de não-lidas (some se = 0)
- Clique abre `NotificationPanel` (dropdown ou sidebar drawer)
- Ao abrir o painel, chamar `markAllRead()` automaticamente

`frontend/src/components/ui/NotificationPanel.tsx`

- Lista de notificações ordenadas por data
- Ícone e cor diferentes por tipo (`CONTENT_READY` → verde, `CALENDAR_UPDATED` → azul, `AUTOMATION_ERROR` → vermelho)
- Estado vazio quando não há notificações
- Link para o post/calendário quando `companyId` disponível

Integrar o `NotificationBell` no menu lateral (Sidebar/Layout existente).

**5e. Automação nas Configurações**

Adicionar seção "Automação" à página `frontend/src/pages/settings/SettingsPage.tsx`:

- Toggle "Ativar automação" (`enabled`)
- Toggle "Gerar conteúdo automaticamente" (`autoGenerateContent`)
- Toggle "Recompor calendário automaticamente" (`autoRefillCalendar`)
- Input numérico "Dias de antecedência para recompor" (`calendarRefillThreshold`, 1–30)
- Botão "Acionar agora" que chama `trigger()` (visível apenas para testes/dev ou se habilitado)
- Salvar com feedback visual (loading + toast de sucesso/erro)

---

## Checklist de entrega

### Backend

- [ ] Migration executada com sucesso
- [ ] `Notification` e `AutomationConfig` no schema, relações inversas em `User` e `Company`
- [ ] `notification.service.ts` com todas as funções (ownership check em markAsRead)
- [ ] `automation.service.ts` com `runAutomationCycle` isolando erros por empresa
- [ ] `automation.queue.ts` e `automation.worker.ts` criados
- [ ] Repeatable job registrado em `worker.ts` (cron `0 3 * * *`, jobId idempotente)
- [ ] `content.worker.ts` cria notificação `CONTENT_READY` ao completar um job
- [ ] `ContentJobPayload` tem `companyId`
- [ ] Rotas de notificação e automação registradas em `app.ts`
- [ ] Todos os endpoints protegidos com `authMiddleware`
- [ ] Nenhum `any` no TypeScript

### Frontend

- [ ] Tipos `Notification` e `AutomationConfig` em `types/index.ts`
- [ ] `notificationService` e `automationService` em `api.ts`
- [ ] `useNotifications.ts` com poll a cada 30s
- [ ] `useAutomation.ts`
- [ ] `NotificationBell` com badge de não-lidas integrado no Sidebar
- [ ] `NotificationPanel` com estados de loading, vazio e erro
- [ ] Seção "Automação" na SettingsPage com todos os toggles e salvar
- [ ] Estados de loading e erro tratados em todos os componentes

---

## Convenções a respeitar obrigatoriamente

- Erros no service: `throw { statusCode: NNN, message: "..." }` — nunca `new Error()` puro
- Controllers: sempre `safeParse` + `try/catch`
- Workers: sempre instanciar `PrismaClient` próprio, graceful shutdown no SIGTERM
- Filas: nunca chamar workers diretamente das rotas
- Frontend: imports com alias `@/`, datas como `string` ISO
- Separação obrigatória: route → controller → service
