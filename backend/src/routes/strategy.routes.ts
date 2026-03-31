import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeStrategyController } from "../controllers/strategy.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function strategyRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const c = makeStrategyController(options.prisma);
  const auth = { preHandler: [authMiddleware] };

  fastify.post("/strategies/generate", auth, c.generateHandler.bind(c));
  fastify.get("/strategies/me", auth, c.getMyStrategyHandler.bind(c));
  fastify.patch("/strategies/:id/approval", auth, c.approvalHandler.bind(c));
}
