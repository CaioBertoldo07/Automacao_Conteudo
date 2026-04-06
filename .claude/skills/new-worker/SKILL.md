---
name: new-worker
description: "Criar novo worker ou fila BullMQ neste projeto. Use quando: novo job assíncrono, nova fila de processamento, novo tipo de tarefa em background, worker para geração de conteúdo, worker para análise de mídia, agendamento de jobs."
---

# New Worker

Cria uma fila BullMQ e o worker correspondente em `backend/src/queues/` e `backend/src/workers/`.

## Quando usar

- Nova tarefa pesada que não pode bloquear a API
- Novo tipo de geração assíncrona
- Escalar processamento com concorrência controlada

## Filas existentes

```
queues/
  content.queue.ts   ← content-generation (concurrency 3, 3 retries, backoff 5s)
  media.queue.ts     ← media-analysis     (concurrency 1, 5 retries, backoff 60s)
```

## Procedimento

### 1. Fila (`queues/<nome>.queue.ts`)

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const <NOME>_QUEUE_NAME = "<nome-do-job>";

export interface <Nome>JobPayload {
  id: string;
  userId: string;
  // campos específicos do job
}

export const <nome>Queue = new Queue<<Nome>JobPayload>(<NOME>_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});
```

**Configurações por tipo de job:**

| Tipo | `attempts` | `delay` inicial | `concurrency` |
|---|---|---|---|
| Geração Gemini | 3 | 5 000 ms | 3 |
| Análise mídia (free tier) | 5 | 60 000 ms | 1 |
| Notificações | 5 | 2 000 ms | 5 |
| Instagram API | 3 | 10 000 ms | 2 |

### 2. Worker (`workers/<nome>.worker.ts`)

```typescript
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { redisConnection } from "../config/redis";
import { <NOME>_QUEUE_NAME, type <Nome>JobPayload } from "../queues/<nome>.queue";
import { process<Nome> } from "../services/<nome>.service";

export function start<Nome>Worker(): Worker<<Nome>JobPayload> {
  const prisma = new PrismaClient();

  const worker = new Worker<<Nome>JobPayload>(
    <NOME>_QUEUE_NAME,
    async (job) => {
      const { id, userId } = job.data;
      console.log(`[Worker] Processando job ${job.id} — id=${id}`);
      await process<Nome>(prisma, id, userId);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] ✓ Job ${job.id} concluído — id=${job.data.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} falhou: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Erro no worker:", err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("[Worker] Encerrando...");
    await worker.close();
    await prisma.$disconnect();
  });

  return worker;
}
```

### 3. Registrar em `worker.ts`

```typescript
import { start<Nome>Worker } from "./workers/<nome>.worker";

const <nome>Worker = start<Nome>Worker();
console.log(`[Worker] <nome> worker iniciado (concurrency=X)`);
```

### 4. Enfileirar no service (não na rota)

```typescript
import { <nome>Queue } from "../queues/<nome>.queue";

await <nome>Queue.add("<descricao>", { id: record.id, userId });
```

## Regras obrigatórias

- Nunca chamar workers diretamente de uma rota
- O worker instancia seu próprio `PrismaClient` (isolado do app)
- `gracefulShutdown` no SIGTERM é obrigatório
- `concurrency: 1` para APIs com rate limit (Gemini free, Instagram)

## Checklist final

- [ ] Fila com `defaultJobOptions` ajustados para o tipo de job
- [ ] `interface *JobPayload` exportada e tipada (sem `any`)
- [ ] Worker com `concurrency` correto
- [ ] Eventos `completed`, `failed`, `error` logados
- [ ] SIGTERM com graceful shutdown
- [ ] Worker registrado em `backend/src/worker.ts`
- [ ] Fila enfileirada no service, não na rota
