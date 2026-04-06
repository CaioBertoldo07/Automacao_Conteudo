import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import { companyRoutes } from "./routes/company.routes";
import { strategyRoutes } from "./routes/strategy.routes";
import { calendarRoutes } from "./routes/calendar.routes";
import { contentRoutes } from "./routes/content.routes";
import { mediaRoutes } from "./routes/media.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { automationRoutes } from "./routes/automation.routes";

export async function buildApp() {
  const fastify = Fastify({
    logger: env.appEnv === "development",
  });

  const prisma = new PrismaClient();

  await fastify.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  fastify.get("/", async () => {
    return { status: "ok", version: "0.1.0" };
  });

  // Static media serving — Phase 5.
  // Serves files saved by storage.ts under MEDIA_DIR at /media/:filename.
  const MEDIA_MIME: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
  };

  fastify.get<{ Params: { "*": string } }>(
    "/media/*",
    async (request, reply) => {
      const rawPath = (request.params as { "*": string })["*"];

      // Reject any path traversal attempt.
      if (rawPath.includes("..") || rawPath.includes("\\")) {
        return reply.code(400).send({ error: "Invalid path." });
      }

      const filepath = path.join(env.mediaDir, rawPath);

      // Check existence synchronously to keep the error path cheap.
      if (!fs.existsSync(filepath)) {
        return reply.code(404).send({ error: "Media not found." });
      }

      const ext = path.extname(rawPath).toLowerCase();
      const contentType = MEDIA_MIME[ext] ?? "application/octet-stream";

      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      return reply.send(createReadStream(filepath));
    }
  );

  fastify.register(authRoutes, { prefix: "/api", prisma });
  fastify.register(userRoutes, { prefix: "/api", prisma });
  fastify.register(companyRoutes, { prefix: "/api", prisma });
  fastify.register(strategyRoutes, { prefix: "/api", prisma });
  fastify.register(calendarRoutes, { prefix: "/api", prisma });
  fastify.register(contentRoutes, { prefix: "/api", prisma });
  fastify.register(mediaRoutes, { prefix: "/api", prisma });
  fastify.register(notificationRoutes, { prefix: "/api", prisma });
  fastify.register(automationRoutes, { prefix: "/api", prisma });

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return fastify;
}
