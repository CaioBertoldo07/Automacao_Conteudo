import type { ConnectionOptions } from "bullmq";
import { env } from "./env";

/**
 * Parses REDIS_URL into a BullMQ-compatible ConnectionOptions object.
 * BullMQ does not accept a raw URL string — it needs host/port/password.
 */
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    db: parseInt(parsed.pathname.slice(1) || "0", 10),
  };
}

export const redisConnection: ConnectionOptions = parseRedisUrl(env.redisUrl);
