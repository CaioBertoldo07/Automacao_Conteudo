import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const AUTOMATION_QUEUE_NAME = "automation";

export interface AutomationJobPayload {
  type: "CHECK_ALL_COMPANIES";
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
