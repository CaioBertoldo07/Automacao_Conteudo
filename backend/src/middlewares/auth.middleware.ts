import { FastifyRequest, FastifyReply } from "fastify";
import { decodeAccessToken } from "../utils/jwt";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Token de autenticação não fornecido." });
    return;
  }

  const token = authHeader.slice(7);
  const payload = decodeAccessToken(token);

  if (!payload || !payload.sub) {
    reply.status(401).send({ error: "Token inválido ou expirado." });
    return;
  }

  request.userId = payload.sub;
}
