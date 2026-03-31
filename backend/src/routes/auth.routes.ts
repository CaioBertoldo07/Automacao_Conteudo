import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeAuthController } from "../controllers/auth.controller";

export async function authRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const controller = makeAuthController(options.prisma);

  fastify.post("/auth/register", controller.registerHandler.bind(controller));
  fastify.post("/auth/login", controller.loginHandler.bind(controller));
}
