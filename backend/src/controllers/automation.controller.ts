import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import {
  getAutomationConfig,
  updateAutomationConfig,
  runAutomationCycle,
} from "../services/automation.service";

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoGenerateContent: z.boolean().optional(),
  autoRefillCalendar: z.boolean().optional(),
  calendarRefillThreshold: z.number().int().min(1).max(30).optional(),
});

export function makeAutomationController(prisma: PrismaClient) {
  return {
    async getConfigHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        // Resolve the user's primary company.
        const company = await prisma.company.findFirst({
          where: { userId: request.userId },
          orderBy: { createdAt: "asc" },
        });

        if (!company) {
          return reply.status(404).send({ error: "Nenhuma empresa cadastrada." });
        }

        const config = await getAutomationConfig(prisma, company.id, request.userId);
        return reply.send(config);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },

    async updateConfigHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = updateConfigSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const company = await prisma.company.findFirst({
          where: { userId: request.userId },
          orderBy: { createdAt: "asc" },
        });

        if (!company) {
          return reply.status(404).send({ error: "Nenhuma empresa cadastrada." });
        }

        const config = await updateAutomationConfig(
          prisma,
          company.id,
          request.userId,
          body.data,
        );
        return reply.send(config);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },

    async triggerHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        // Fire-and-forget: the cycle runs asynchronously so the response is immediate.
        runAutomationCycle(prisma).catch((err: Error) => {
          console.error(`[AutomationController] Trigger manual falhou: ${err.message}`);
        });
        return reply.status(202).send({ ok: true, message: "Ciclo de automação iniciado." });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
