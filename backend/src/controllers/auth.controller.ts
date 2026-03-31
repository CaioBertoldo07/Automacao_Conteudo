import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { login, register } from "../services/auth.service";

const registerSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres."),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Senha obrigatória."),
});

export function makeAuthController(prisma: PrismaClient) {
  return {
    async registerHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = registerSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const result = await register(prisma, body.data);
        return reply.status(201).send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply
          .status(e.statusCode ?? 500)
          .send({ error: e.message ?? "Erro interno." });
      }
    },

    async loginHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = loginSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      try {
        const result = await login(prisma, body.data);
        return reply.send(result);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply
          .status(e.statusCode ?? 500)
          .send({ error: e.message ?? "Erro interno." });
      }
    },
  };
}
