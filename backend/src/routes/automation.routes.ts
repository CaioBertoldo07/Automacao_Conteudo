import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middlewares/auth.middleware";
import { makeAutomationController } from "../controllers/automation.controller";

export async function automationRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient },
): Promise<void> {
  const controller = makeAutomationController(options.prisma);

  fastify.get(
    "/automation/config",
    { preHandler: [authMiddleware] },
    controller.getConfigHandler.bind(controller),
  );

  fastify.patch(
    "/automation/config",
    { preHandler: [authMiddleware] },
    controller.updateConfigHandler.bind(controller),
  );

  fastify.post(
    "/automation/trigger",
    { preHandler: [authMiddleware] },
    controller.triggerHandler.bind(controller),
  );
}
