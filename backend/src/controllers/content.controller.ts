import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, ContentType, JobStatus } from "@prisma/client";
import {
  enqueuePostContent,
  enqueueBatch,
  getJobStatus,
  getDashboardStats,
  listPosts,
  getPostMediaUrl,
  type PostsFilter,
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

    /** GET /posts/stats → dashboard aggregated counts */
    async getDashboardStatsHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const result = await getDashboardStats(prisma, request.userId);
        reply.send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },

    /** GET /posts → paginated post list with optional filters */
    async listPostsHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const q = request.query as Record<string, string | undefined>;

        // ── Input validation (400 on bad params, never 500) ──────────────
        const VALID_STATUSES = new Set<string>(["PENDING", "PROCESSING", "DONE", "FAILED"]);
        const VALID_TYPES = new Set<string>(["IMAGE", "REEL", "STORY"]);

        if (q.status && !VALID_STATUSES.has(q.status)) {
          return reply.status(400).send({
            error: `Status inválido: "${q.status}". Valores aceitos: PENDING, PROCESSING, DONE, FAILED.`,
          });
        }
        if (q.type && !VALID_TYPES.has(q.type)) {
          return reply.status(400).send({
            error: `Tipo inválido: "${q.type}". Valores aceitos: IMAGE, REEL, STORY.`,
          });
        }
        if (q.from && isNaN(Date.parse(q.from))) {
          return reply.status(400).send({
            error: 'Parâmetro "from" deve ser uma data válida (YYYY-MM-DD).',
          });
        }
        if (q.to && isNaN(Date.parse(q.to))) {
          return reply.status(400).send({
            error: 'Parâmetro "to" deve ser uma data válida (YYYY-MM-DD).',
          });
        }
        if (q.from && q.to && Date.parse(q.from) > Date.parse(q.to)) {
          return reply.status(400).send({
            error: '"from" não pode ser posterior a "to".',
          });
        }

        const pageNum = q.page ? parseInt(q.page, 10) : undefined;
        if (pageNum !== undefined && (isNaN(pageNum) || pageNum < 1)) {
          return reply.status(400).send({ error: '"page" deve ser um inteiro positivo.' });
        }

        const limitNum = q.limit ? parseInt(q.limit, 10) : undefined;
        if (limitNum !== undefined && (isNaN(limitNum) || limitNum < 1 || limitNum > 100)) {
          return reply.status(400).send({ error: '"limit" deve ser um inteiro entre 1 e 100.' });
        }
        // ────────────────────────────────────────────────────────────────

        const params: PostsFilter = {
          status: q.status as JobStatus | undefined,
          type: q.type as ContentType | undefined,
          from: q.from,
          to: q.to,
          page: pageNum,
          limit: limitNum,
        };
        const result = await listPosts(prisma, request.userId, params);
        reply.send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },

    /** GET /posts/:id/download → validates ownership, returns mediaUrl */
    async downloadPostMediaHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const result = await getPostMediaUrl(prisma, request.userId, id);
        reply.send(result);
      } catch (err) {
        handleError(reply, err);
      }
    },
  };
}

export type ContentController = ReturnType<typeof makeContentController>;
