import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  enqueuePostContent,
  enqueueBatch,
  getJobStatus,
} from "../services/content.service";

function handleError(reply: FastifyReply, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
}

export function makeContentController(prisma: PrismaClient) {
  return {
    /** POST /content/:id/generate → 202 Accepted */
    async generateOne(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const result = await enqueuePostContent(prisma, request.userId, id);
        reply.status(202).send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },

    /** POST /content/batch → 202 Accepted */
    async generateBatchHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const result = await enqueueBatch(prisma, request.userId);
        reply.status(202).send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },

    /** GET /content/jobs/:aiJobId */
    async getJobStatusHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { aiJobId } = request.params as { aiJobId: string };
        const result = await getJobStatus(prisma, aiJobId, request.userId);
        reply.send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },
  };
}

export type ContentController = ReturnType<typeof makeContentController>;
