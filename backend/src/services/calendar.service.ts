import { PrismaClient, ContentType, JobStatus, StrategyApprovalStatus } from "@prisma/client";

async function findUserCompany(prisma: PrismaClient, userId: string) {
  return prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function generateCalendar(prisma: PrismaClient, userId: string) {
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

  if (strategy.approvalStatus !== StrategyApprovalStatus.APPROVED) {
    throw Object.assign(
      new Error("A estratégia precisa ser aprovada antes de gerar o calendário."),
      { statusCode: 422 }
    );
  }

  const content = strategy.content as {
    postIdeas: Array<{ format: string; title: string }>;
  };

  const postIdeas = content.postIdeas ?? [];
  const frequency = company.postingFrequency; // posts per month
  const totalPosts = frequency;
  const intervalDays = 30 / totalPosts;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(9, 0, 0, 0);

  // Delete existing PENDING calendar entries for the company
  await prisma.contentCalendar.deleteMany({
    where: {
      companyId: company.id,
      status: JobStatus.PENDING,
    },
  });

  const entries = Array.from({ length: totalPosts }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.round(i * intervalDays));

    const idea = postIdeas[i % postIdeas.length];
    const type = (idea?.format as ContentType) ?? ContentType.IMAGE;

    return {
      companyId: company.id,
      date,
      type,
      status: JobStatus.PENDING,
    };
  });

  await prisma.contentCalendar.createMany({ data: entries });

  return prisma.contentCalendar.findMany({
    where: { companyId: company.id },
    orderBy: { date: "asc" },
    include: { post: true },
  });
}

export async function getMyCalendar(prisma: PrismaClient, userId: string) {
  const company = await findUserCompany(prisma, userId);
  if (!company) {
    throw Object.assign(new Error("Nenhuma empresa cadastrada."), { statusCode: 404 });
  }

  return prisma.contentCalendar.findMany({
    where: { companyId: company.id },
    orderBy: { date: "asc" },
    include: { post: true },
  });
}

export async function deleteCalendarEntry(
  prisma: PrismaClient,
  userId: string,
  entryId: string
) {
  const entry = await prisma.contentCalendar.findUnique({
    where: { id: entryId },
    include: { company: true },
  });

  if (!entry) {
    throw Object.assign(new Error("Entrada não encontrada."), { statusCode: 404 });
  }

  if (entry.company.userId !== userId) {
    throw Object.assign(new Error("Acesso negado."), { statusCode: 403 });
  }

  await prisma.contentCalendar.delete({ where: { id: entryId } });
}
