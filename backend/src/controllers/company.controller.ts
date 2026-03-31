import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import {
  createCompany,
  deleteCompany,
  getCompaniesByUserId,
  getCompanyById,
  getMyProfile,
  updateCompany,
} from "../services/company.service";

const createSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres."),
  niche: z.string().min(2, "Nicho deve ter no mínimo 2 caracteres."),
  description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres."),
  city: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres."),
  tone: z.string().min(2, "Tom deve ter no mínimo 2 caracteres."),
  postingFrequency: z.number().int().min(1).max(365).optional(),
});

const updateSchema = createSchema.partial();

export function makeCompanyController(prisma: PrismaClient) {
  return {
    async listHandler(request: FastifyRequest, reply: FastifyReply) {
      const companies = await getCompaniesByUserId(prisma, request.userId);
      return reply.send(companies);
    },

    async getHandler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const company = await getCompanyById(prisma, id);
      if (!company) {
        return reply.status(404).send({ error: "Empresa não encontrada." });
      }
      if (company.userId !== request.userId) {
        return reply.status(403).send({ error: "Acesso negado." });
      }
      return reply.send(company);
    },

    async createHandler(request: FastifyRequest, reply: FastifyReply) {
      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }
      const company = await createCompany(prisma, request.userId, body.data);
      return reply.status(201).send(company);
    },

    async updateHandler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const company = await getCompanyById(prisma, id);
      if (!company) {
        return reply.status(404).send({ error: "Empresa não encontrada." });
      }
      if (company.userId !== request.userId) {
        return reply.status(403).send({ error: "Acesso negado." });
      }

      const body = updateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.errors[0].message });
      }

      const updated = await updateCompany(prisma, id, body.data);
      return reply.send(updated);
    },

    async deleteHandler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const company = await getCompanyById(prisma, id);
      if (!company) {
        return reply.status(404).send({ error: "Empresa não encontrada." });
      }
      if (company.userId !== request.userId) {
        return reply.status(403).send({ error: "Acesso negado." });
      }

      await deleteCompany(prisma, id);
      return reply.status(204).send();
    },

    async getMyProfileHandler(request: FastifyRequest, reply: FastifyReply) {
      const profile = await getMyProfile(prisma, request.userId);
      if (!profile) {
        return reply.status(404).send({ error: "Nenhuma empresa cadastrada." });
      }
      return reply.send(profile);
    },
  };
}
