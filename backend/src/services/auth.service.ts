import { PrismaClient } from "@prisma/client";
import { createAccessToken } from "../utils/jwt";
import { verifyPassword } from "../utils/password";
import { createUser, getUserByEmail } from "./user.service";

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  user: {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    createdAt: Date;
  };
}

export async function register(
  prisma: PrismaClient,
  data: RegisterInput
): Promise<TokenResponse> {
  const existing = await getUserByEmail(prisma, data.email);
  if (existing) {
    throw { statusCode: 409, message: "E-mail já cadastrado." };
  }

  const user = await createUser(prisma, data);
  const token = createAccessToken(user.id);

  return {
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  };
}

export async function login(
  prisma: PrismaClient,
  data: LoginInput
): Promise<TokenResponse> {
  const user = await getUserByEmail(prisma, data.email);

  if (!user || !(await verifyPassword(data.password, user.password))) {
    throw { statusCode: 401, message: "Credenciais inválidas." };
  }

  if (!user.isActive) {
    throw { statusCode: 403, message: "Conta desativada." };
  }

  const token = createAccessToken(user.id);

  return {
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  };
}
