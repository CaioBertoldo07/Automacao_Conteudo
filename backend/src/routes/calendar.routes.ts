import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeCalendarController } from "../controllers/calendar.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function calendarRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const c = makeCalendarController(options.prisma);
  const auth = { preHandler: [authMiddleware] };

  fastify.post("/calendars/generate", auth, c.generate.bind(c));
  fastify.get("/calendars/me", auth, c.getMe.bind(c));
  fastify.delete("/calendars/:id", auth, c.remove.bind(c));
}
