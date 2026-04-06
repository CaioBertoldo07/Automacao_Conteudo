import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

type MediaType = "IMAGE" | "VIDEO";
import {
  uploadCompanyMedia,
  listCompanyMedia,
  deleteCompanyMedia,
  getCompanyMediaById,
  toggleCompanyMediaActive,
} from "../services/media.service";

const toggleSchema = z.object({ isActive: z.boolean() });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

export function makeMediaController(prisma: PrismaClient) {
  return {
    async uploadMedia(request: FastifyRequest, reply: FastifyReply) {
      const { companyId } = request.params as { companyId: string };
      const userId = request.userId;

      // Parse multipart file
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "Nenhum arquivo enviado." });
      }

      // Validate MIME type before reading the buffer
      const rawMime = data.mimetype.split(";")[0].trim();
      if (!ALLOWED_MIME_TYPES.has(rawMime)) {
        return reply.code(400).send({
          error: `Tipo de arquivo não suportado: ${rawMime}. Formatos aceitos: JPEG, PNG, WebP, MP4.`,
        });
      }

      const buffer = await data.toBuffer();
      const originalFilename = data.filename;

      try {
        const media = await uploadCompanyMedia(
          prisma,
          companyId,
          userId,
          buffer,
          rawMime,
          originalFilename
        );
        return reply.code(201).send(media);
      } catch (err: unknown) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },

    async listMedia(request: FastifyRequest, reply: FastifyReply) {
      const { companyId } = request.params as { companyId: string };
      const { category, type } = request.query as {
        category?: string;
        type?: string;
      };

      const filters: { category?: string; type?: MediaType } = {};
      if (category) filters.category = category;
      if (type && ["IMAGE", "VIDEO"].includes(type)) {
        filters.type = type as MediaType;
      }

      try {
        const media = await listCompanyMedia(prisma, companyId, request.userId, filters);
        return reply.send(media);
      } catch (err: unknown) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },

    async getMedia(request: FastifyRequest, reply: FastifyReply) {
      const { mediaId } = request.params as { mediaId: string };

      try {
        const media = await getCompanyMediaById(prisma, mediaId, request.userId);
        return reply.send(media);
      } catch (err: unknown) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },

    async toggleMedia(request: FastifyRequest, reply: FastifyReply) {
      const { mediaId } = request.params as { mediaId: string };

      const body = toggleSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: body.error.errors[0].message });
      }

      try {
        const media = await toggleCompanyMediaActive(
          prisma,
          mediaId,
          request.userId,
          body.data.isActive
        );
        return reply.send(media);
      } catch (err: unknown) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },

    async deleteMedia(request: FastifyRequest, reply: FastifyReply) {
      const { mediaId } = request.params as { mediaId: string };

      try {
        await deleteCompanyMedia(prisma, mediaId, request.userId);
        return reply.code(204).send();
      } catch (err: unknown) {
        const e = err as Error & { statusCode?: number };
        return reply.code(e.statusCode ?? 500).send({ error: e.message });
      }
    },
  };
}
