import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeContentController } from "../controllers/content.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function contentRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const c = makeContentController(options.prisma);
  const auth = { preHandler: [authMiddleware] };

  // Static routes registered before parametric ones to avoid collision.
  fastify.post("/content/batch", auth, c.generateBatchHandler.bind(c));
  fastify.post("/content/:id/generate", auth, c.generateOne.bind(c));
  fastify.get("/content/jobs/:aiJobId", auth, c.getJobStatusHandler.bind(c));

  // Phase 7 — dashboard & post management
  fastify.get("/posts/stats", auth, c.getDashboardStatsHandler.bind(c));
  fastify.get("/posts", auth, c.listPostsHandler.bind(c));
  fastify.get("/posts/:id/download", auth, c.downloadPostMediaHandler.bind(c));
}
