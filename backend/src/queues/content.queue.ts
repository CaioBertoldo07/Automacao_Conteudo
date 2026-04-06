import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const CONTENT_QUEUE_NAME = "content-generation";

export interface ContentJobPayload {
  aiJobId: string;
  calendarEntryId: string;
  userId: string;
  useCompanyMedia?: boolean;
}

export const contentQueue = new Queue<ContentJobPayload>(CONTENT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
