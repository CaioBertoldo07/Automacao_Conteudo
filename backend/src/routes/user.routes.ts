import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeUserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function userRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const controller = makeUserController(options.prisma);

  fastify.get(
    "/users/me",
    { preHandler: [authMiddleware] },
    controller.getMeHandler.bind(controller)
  );

  fastify.patch(
    "/users/me",
    { preHandler: [authMiddleware] },
    controller.updateMeHandler.bind(controller)
  );
}
