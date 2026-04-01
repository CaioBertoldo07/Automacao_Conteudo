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

  // Static route registered before the parametric one to avoid collision
  fastify.post("/content/batch", auth, c.generateBatchHandler.bind(c));
  fastify.post("/content/:id/generate", auth, c.generateOne.bind(c));
}
