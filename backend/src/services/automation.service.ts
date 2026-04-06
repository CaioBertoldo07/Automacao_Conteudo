import { PrismaClient, JobStatus, NotificationType } from "@prisma/client";
import { generateCalendar } from "./calendar.service";
import { enqueuePostContent } from "./content.service";
import { createNotification } from "./notification.service";

// ─── Config helpers ──────────────────────────────────────────────────────────

export async function getAutomationConfig(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw { statusCode: 404, message: "Empresa não encontrada." };
  }

  const existing = await prisma.automationConfig.findUnique({
    where: { companyId },
  });

  if (existing) return existing;

  // Create with defaults if not yet configured.
  return prisma.automationConfig.create({
    data: { companyId },
  });
}

export interface UpdateAutomationConfigInput {
  enabled?: boolean;
  autoGenerateContent?: boolean;
  autoRefillCalendar?: boolean;
  calendarRefillThreshold?: number;
}

export async function updateAutomationConfig(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  data: UpdateAutomationConfigInput,
) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
  });

  if (!company) {
    throw { statusCode: 404, message: "Empresa não encontrada." };
  }

  return prisma.automationConfig.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
}

// ─── Automation cycle ────────────────────────────────────────────────────────

export async function runAutomationCycle(prisma: PrismaClient): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { automationConfig: { enabled: true } },
    include: { automationConfig: true },
  });

  console.log(
    `[AutomationService] ${companies.length} empresa(s) com automação ativa.`,
  );

  for (const company of companies) {
    try {
      await processCompanyAutomation(prisma, company);
    } catch (err) {
      console.error(
        `[AutomationService] Erro na empresa ${company.id}: ${(err as Error).message}`,
      );
      await createNotification(prisma, {
        userId: company.userId,
        companyId: company.id,
        type: NotificationType.AUTOMATION_ERROR,
        title: "Erro na automação",
        message: `Ocorreu um erro durante o ciclo de automação: ${(err as Error).message}`,
      }).catch(() => {
        // swallow notification errors to avoid cascading failures
      });
    }
  }
}

async function processCompanyAutomation(
  prisma: PrismaClient,
  company: { id: string; userId: string; automationConfig: { autoRefillCalendar: boolean; calendarRefillThreshold: number; autoGenerateContent: boolean } | null },
): Promise<void> {
  const config = company.automationConfig;
  if (!config) return;

  // ── Auto-refill calendar ───────────────────────────────────────────────────
  if (config.autoRefillCalendar) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + config.calendarRefillThreshold);

    const upcomingPending = await prisma.contentCalendar.count({
      where: {
        companyId: company.id,
        status: JobStatus.PENDING,
        date: { lte: thresholdDate },
      },
    });

    if (upcomingPending < 3) {
      try {
        await generateCalendar(prisma, company.userId);
        await createNotification(prisma, {
          userId: company.userId,
          companyId: company.id,
          type: NotificationType.CALENDAR_UPDATED,
          title: "Calendário atualizado",
          message: "Seu calendário de conteúdo foi recomposto automaticamente.",
        });
        console.log(
          `[AutomationService] Calendário recomposto para empresa ${company.id}`,
        );
      } catch (err) {
        console.error(
          `[AutomationService] Falha ao recompor calendário (empresa ${company.id}): ${(err as Error).message}`,
        );
      }
    }
  }

  // ── Auto-generate content ─────────────────────────────────────────────────
  if (config.autoGenerateContent) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() + 24);

    const pendingEntries = await prisma.contentCalendar.findMany({
      where: {
        companyId: company.id,
        status: JobStatus.PENDING,
        date: { lte: cutoff },
      },
    });

    for (const entry of pendingEntries) {
      try {
        await enqueuePostContent(prisma, company.userId, entry.id);
        console.log(
          `[AutomationService] Enfileirado entry ${entry.id} (empresa ${company.id})`,
        );
      } catch (err) {
        console.error(
          `[AutomationService] Falha ao enfileirar entry ${entry.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
