import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const MEDIA_ANALYSIS_QUEUE_NAME = "media-analysis";

export interface MediaAnalysisJobPayload {
  mediaId: string;
}

export const mediaAnalysisQueue = new Queue<MediaAnalysisJobPayload>(
  MEDIA_ANALYSIS_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  }
);
