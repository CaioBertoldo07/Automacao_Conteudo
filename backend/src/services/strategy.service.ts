import { PrismaClient, StrategyApprovalStatus } from "@prisma/client";
import { generateStrategy } from "../agents/claude.agent";

async function findUserCompany(prisma: PrismaClient, userId: string) {
  return prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { brandProfile: true },
  });
}

export async function generateContentStrategy(prisma: PrismaClient, userId: string) {
  const company = await findUserCompany(prisma, userId);
  if (!company) {
    throw Object.assign(new Error("Nenhuma empresa cadastrada."), { statusCode: 404 });
  }

  const content = await generateStrategy({
    name: company.name,
    niche: company.niche,
    description: company.description,
    city: company.city,
    tone: company.tone,
    postingFrequency: company.postingFrequency,
    brandProfile: company.brandProfile,
  });

  return prisma.contentStrategy.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      content: content as object,
      approvalStatus: StrategyApprovalStatus.PENDING_APPROVAL,
    },
    update: {
      content: content as object,
      approvalStatus: StrategyApprovalStatus.PENDING_APPROVAL,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    },
  });
}

export async function getMyStrategy(prisma: PrismaClient, userId: string) {
  const company = await findUserCompany(prisma, userId);
  if (!company) {
    throw Object.assign(new Error("Nenhuma empresa cadastrada."), { statusCode: 404 });
  }

  const strategy = await prisma.contentStrategy.findUnique({
    where: { companyId: company.id },
  });

  if (!strategy) {
    throw Object.assign(new Error("Nenhuma estratégia gerada ainda."), { statusCode: 404 });
  }

  return strategy;
}

export async function updateApproval(
  prisma: PrismaClient,
  userId: string,
  strategyId: string,
  action: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  const strategy = await prisma.contentStrategy.findUnique({
    where: { id: strategyId },
    include: { company: true },
  });

  if (!strategy) {
    throw Object.assign(new Error("Estratégia não encontrada."), { statusCode: 404 });
  }

  if (strategy.company.userId !== userId) {
    throw Object.assign(new Error("Acesso negado."), { statusCode: 403 });
  }

  const now = new Date();
  return prisma.contentStrategy.update({
    where: { id: strategyId },
    data:
      action === "APPROVED"
        ? { approvalStatus: StrategyApprovalStatus.APPROVED, approvedAt: now, rejectedAt: null, rejectionReason: null }
        : { approvalStatus: StrategyApprovalStatus.REJECTED, rejectedAt: now, approvedAt: null, rejectionReason: rejectionReason ?? null },
  });
}
