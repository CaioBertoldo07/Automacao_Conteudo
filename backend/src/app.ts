import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";

export async function buildApp() {
  const fastify = Fastify({
    logger: env.appEnv === "development",
  });

  const prisma = new PrismaClient();

  await fastify.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  fastify.get("/", async () => {
    return { status: "ok", version: "0.1.0" };
  });

  fastify.register(authRoutes, { prefix: "/api", prisma });
  fastify.register(userRoutes, { prefix: "/api", prisma });

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return fastify;
}
