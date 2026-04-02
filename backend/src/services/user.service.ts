import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../utils/password";

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export async function getUserById(prisma: PrismaClient, userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(prisma: PrismaClient, data: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: data.email,
      password: await hashPassword(data.password),
      name: data.name,
    },
  });
}

export async function updateUser(
  prisma: PrismaClient,
  userId: string,
  data: UpdateUserInput
) {
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  return prisma.user.update({ where: { id: userId }, data: updateData });
}

export async function deactivateUser(prisma: PrismaClient, userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { isActive: false } });
}

export async function changePassword(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error("Usuário não encontrado."), { statusCode: 404 });

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) throw Object.assign(new Error("Senha atual incorreta."), { statusCode: 400 });

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}
