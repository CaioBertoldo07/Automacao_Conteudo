import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeMediaController } from "../controllers/media.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function mediaRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const c = makeMediaController(options.prisma);
  const auth = { preHandler: [authMiddleware] };

  fastify.post("/companies/:companyId/media", auth, c.uploadMedia.bind(c));
  fastify.get("/companies/:companyId/media", auth, c.listMedia.bind(c));
  fastify.get("/companies/:companyId/media/:mediaId", auth, c.getMedia.bind(c));
  fastify.patch("/companies/:companyId/media/:mediaId", auth, c.toggleMedia.bind(c));
  fastify.delete("/companies/:companyId/media/:mediaId", auth, c.deleteMedia.bind(c));
}
