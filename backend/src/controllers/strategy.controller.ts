import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import {
  generateContentStrategy,
  getMyStrategy,
  updateApproval,
} from "../services/strategy.service";

const approvalSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; message?: string };
  return reply
    .status(e.statusCode ?? 500)
    .send({ error: e.message ?? "Erro interno." });
}

export function makeStrategyController(prisma: PrismaClient) {
  return {
    async generateHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const strategy = await generateContentStrategy(prisma, request.userId);
        return reply.status(201).send(strategy);
      } catch (err) {
        return handleError(err, reply);
      }
    },

    async getMyStrategyHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const strategy = await getMyStrategy(prisma, request.userId);
        return reply.send(strategy);
      } catch (err) {
        return handleError(err, reply);
      }
    },

    async approvalHandler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };

      const body = approvalSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const updated = await updateApproval(
          prisma,
          request.userId,
          id,
          body.data.action,
          body.data.rejectionReason
        );
        return reply.send(updated);
      } catch (err) {
        return handleError(err, reply);
      }
    },
  };
}
