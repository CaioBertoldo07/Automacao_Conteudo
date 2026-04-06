import { PrismaClient } from "@prisma/client";

export interface CreateCompanyInput {
  name: string;
  niche: string;
  description: string;
  city: string;
  tone: string;
  postingFrequency?: number;
}

export interface UpdateCompanyInput {
  name?: string;
  niche?: string;
  description?: string;
  city?: string;
  tone?: string;
  postingFrequency?: number;
}

export async function getCompaniesByUserId(prisma: PrismaClient, userId: string) {
  return prisma.company.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanyById(prisma: PrismaClient, id: string) {
  return prisma.company.findUnique({ where: { id } });
}

export async function createCompany(
  prisma: PrismaClient,
  userId: string,
  data: CreateCompanyInput
) {
  return prisma.company.create({
    data: {
      name: data.name,
      niche: data.niche,
      description: data.description,
      city: data.city,
      tone: data.tone,
      postingFrequency: data.postingFrequency ?? 12,
      userId,
    },
  });
}

export async function updateCompany(
  prisma: PrismaClient,
  id: string,
  data: UpdateCompanyInput
) {
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  return prisma.company.update({ where: { id }, data: updateData });
}

export async function deleteCompany(prisma: PrismaClient, id: string) {
  return prisma.company.delete({ where: { id } });
}

export async function getMyProfile(prisma: PrismaClient, userId: string) {
  return prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { brandProfile: true },
  });
}

export interface UpdateBrandProfileInput {
  description?: string;
  targetAudience?: string;
  mainProducts?: string;
  communicationStyle?: string;
  logoUrl?: string;
  brandColors?: string[];
  visualStyle?: string;
}

export async function updateBrandProfile(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  data: UpdateBrandProfileInput
) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw Object.assign(new Error("Empresa não encontrada."), { statusCode: 404 });
  }
  if (company.userId !== userId) {
    throw Object.assign(new Error("Acesso negado."), { statusCode: 403 });
  }

  const updateData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  return prisma.brandProfile.upsert({
    where: { companyId },
    create: {
      companyId,
      description: data.description ?? "",
      targetAudience: data.targetAudience ?? "",
      mainProducts: data.mainProducts ?? "",
      communicationStyle: data.communicationStyle ?? "",
      logoUrl: data.logoUrl,
      brandColors: data.brandColors ?? [],
      visualStyle: data.visualStyle,
    },
    update: updateData,
  });
}
