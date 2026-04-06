import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { redisConnection } from "../config/redis";
import {
  MEDIA_ANALYSIS_QUEUE_NAME,
  type MediaAnalysisJobPayload,
} from "../queues/media.queue";
import { analyzeMediaJob } from "../services/media.service";

export function startMediaWorker(): Worker<MediaAnalysisJobPayload> {
  const prisma = new PrismaClient();

  const worker = new Worker<MediaAnalysisJobPayload>(
    MEDIA_ANALYSIS_QUEUE_NAME,
    async (job) => {
      const { mediaId } = job.data;
      console.log(`[MediaWorker] Analisando mídia ${mediaId} — job ${job.id}`);
      await analyzeMediaJob(prisma, mediaId);
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 1, duration: 15_000 },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[MediaWorker] ✓ Análise concluída para job ${job.id} — mediaId=${job.data.mediaId}`);
  });

  worker.on("failed", (job, err) => {
    // Fail silently — log the error but do not rethrow so the main worker process stays alive.
    console.error(
      `[MediaWorker] ✗ Análise falhou para job ${job?.id} (mediaId=${job?.data?.mediaId}): ${err.message}`
    );
  });

  worker.on("error", (err) => {
    console.error("[MediaWorker] Erro no worker de análise:", err.message);
  });

  return worker;
}
