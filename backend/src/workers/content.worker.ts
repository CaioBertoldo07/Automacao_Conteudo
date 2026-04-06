import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { redisConnection } from "../config/redis";
import { CONTENT_QUEUE_NAME, type ContentJobPayload } from "../queues/content.queue";
import { processPostContent } from "../services/content.service";

export function startContentWorker(): Worker<ContentJobPayload> {
  const prisma = new PrismaClient();

  const worker = new Worker<ContentJobPayload>(
    CONTENT_QUEUE_NAME,
    async (job) => {
      const { aiJobId, calendarEntryId, userId, useCompanyMedia } = job.data;
      console.log(`[Worker] Processando job ${job.id} — aiJobId=${aiJobId} useCompanyMedia=${useCompanyMedia ?? false}`);
      await processPostContent(prisma, aiJobId, calendarEntryId, userId, useCompanyMedia ?? false);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] ✓ Job ${job.id} concluído — aiJobId=${job.data.aiJobId}`);
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
