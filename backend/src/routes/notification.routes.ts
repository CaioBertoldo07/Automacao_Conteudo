import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middlewares/auth.middleware";
import { makeNotificationController } from "../controllers/notification.controller";

export async function notificationRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient },
): Promise<void> {
  const controller = makeNotificationController(options.prisma);

  fastify.get(
    "/notifications",
    { preHandler: [authMiddleware] },
    controller.listHandler.bind(controller),
  );

  fastify.get(
    "/notifications/unread-count",
    { preHandler: [authMiddleware] },
    controller.unreadCountHandler.bind(controller),
  );

  fastify.patch(
    "/notifications/read-all",
    { preHandler: [authMiddleware] },
    controller.markAllReadHandler.bind(controller),
  );

  fastify.patch(
    "/notifications/:id/read",
    { preHandler: [authMiddleware] },
    controller.markReadHandler.bind(controller),
  );
}
