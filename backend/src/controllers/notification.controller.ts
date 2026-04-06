import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  countUnread,
} from "../services/notification.service";

export function makeNotificationController(prisma: PrismaClient) {
  return {
    async listHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const notifications = await listNotifications(prisma, request.userId);
        return reply.send(notifications);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },

    async markReadHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { id } = request.params as { id: string };
        const notification = await markAsRead(prisma, id, request.userId);
        return reply.send(notification);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },

    async markAllReadHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        await markAllAsRead(prisma, request.userId);
        return reply.send({ ok: true });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },

    async unreadCountHandler(request: FastifyRequest, reply: FastifyReply) {
      try {
        const count = await countUnread(prisma, request.userId);
        return reply.send({ count });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
