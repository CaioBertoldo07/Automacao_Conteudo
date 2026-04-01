import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { generatePostContent, generateBatch } from "../services/content.service";

function handleError(reply: FastifyReply, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
}

export function makeContentController(prisma: PrismaClient) {
  return {
    async generateOne(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const entry = await generatePostContent(prisma, request.userId, id);
        reply.send(entry);
      } catch (err) {
        handleError(reply, err);
      }
    },

    async generateBatchHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const result = await generateBatch(prisma, request.userId);
        reply.send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },
  };
}

export type ContentController = ReturnType<typeof makeContentController>;

export interface ContentRouteOptions extends Record<string, unknown> {
  prisma: PrismaClient;
  fastify?: FastifyInstance;
}
