import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generateCalendar, getMyCalendar, deleteCalendarEntry } from "../services/calendar.service";

function handleError(reply: FastifyReply, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
}

export function makeCalendarController(prisma: PrismaClient) {
  return {
    async generate(request: FastifyRequest, reply: FastifyReply) {
      try {
        const entries = await generateCalendar(prisma, request.userId);
        reply.status(201).send(entries);
      } catch (err) {
        handleError(reply, err);
      }
    },

    async getMe(request: FastifyRequest, reply: FastifyReply) {
      try {
        const entries = await getMyCalendar(prisma, request.userId);
        reply.send(entries);
      } catch (err) {
        handleError(reply, err);
      }
    },

    async remove(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        await deleteCalendarEntry(prisma, request.userId, id);
        reply.status(204).send();
      } catch (err) {
        handleError(reply, err);
      }
    },
  };
}

export type CalendarController = ReturnType<typeof makeCalendarController>;

// Needed for Fastify plugin typing
export interface CalendarRouteOptions extends Record<string, unknown> {
  prisma: PrismaClient;
  fastify?: FastifyInstance;
}
