import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { makeCompanyController } from "../controllers/company.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export async function companyRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
): Promise<void> {
  const c = makeCompanyController(options.prisma);
  const auth = { preHandler: [authMiddleware] };

  // Rota estática registrada antes de /:id para garantir matching correto
  fastify.get("/companies/profile/me", auth, c.getMyProfileHandler.bind(c));
  fastify.get("/companies", auth, c.listHandler.bind(c));
  fastify.post("/companies", auth, c.createHandler.bind(c));
  fastify.get("/companies/:id", auth, c.getHandler.bind(c));
  fastify.patch("/companies/:id", auth, c.updateHandler.bind(c));
  fastify.delete("/companies/:id", auth, c.deleteHandler.bind(c));
}
