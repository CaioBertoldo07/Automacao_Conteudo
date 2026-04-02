import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { getUserById, updateUser, changePassword } from "../services/user.service";

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória."),
  newPassword: z.string().min(8, "A nova senha precisa ter no mínimo 8 caracteres."),
});

export function makeUserController(prisma: PrismaClient) {
  return {
    async getMeHandler(request: FastifyRequest, reply: FastifyReply) {
      const user = await getUserById(prisma, request.userId);

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado." });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      });
    },

    async updateMeHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = updateUserSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      const user = await updateUser(prisma, request.userId, body.data);

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      });
    },

    async changePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = changePasswordSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        await changePassword(
          prisma,
          request.userId,
          body.data.currentPassword,
          body.data.newPassword
        );
        return reply.send({ message: "Senha alterada com sucesso." });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 500).send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
