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
      concurrency: 1,
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
