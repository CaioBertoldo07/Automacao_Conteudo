import { PrismaClient, ContentType, JobStatus, StrategyApprovalStatus } from "@prisma/client";
import type { StrategyContent } from "../agents/claude.agent";
import { generateCaption, type CaptionContext } from "../agents/content.agent";
import { generateImage } from "../agents/image.adapter";
import { generateVideo } from "../agents/video.adapter";
import { uploadMedia } from "../utils/storage";

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

async function findUserCompany(prisma: PrismaClient, userId: string) {
  return prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function generatePostContent(
  prisma: PrismaClient,
  userId: string,
  calendarEntryId: string
) {
  const entry = await prisma.contentCalendar.findUnique({
    where: { id: calendarEntryId },
    include: {
      company: {
        include: { brandProfile: true, contentStrategy: true },
      },
    },
  });

  if (!entry) throw makeError("Entrada de calendário não encontrada.", 404);
  if (entry.company.userId !== userId) throw makeError("Acesso negado.", 403);
  if (entry.status === JobStatus.DONE) {
    throw makeError("Conteúdo já foi gerado para esta entrada.", 422);
  }
  if (entry.status === JobStatus.PROCESSING) {
    throw makeError("Geração já em andamento para esta entrada.", 422);
  }

  const strategy = entry.company.contentStrategy;
  if (!strategy) throw makeError("Estratégia não encontrada.", 404);
  if (strategy.approvalStatus !== StrategyApprovalStatus.APPROVED) {
    throw makeError("A estratégia precisa estar aprovada para gerar conteúdo.", 422);
  }

  const strategyContent = strategy.content as unknown as StrategyContent;
  const postIdeas = strategyContent.postIdeas ?? [];
  const ideaIndex =
    postIdeas.length > 0 ? (entry.postIdeaIndex ?? 0) % postIdeas.length : 0;
  const postIdea = postIdeas[ideaIndex] ?? {
    title: String(entry.type),
    objective: "Publicação de conteúdo",
    format: entry.type,
    hook: "",
    description: entry.company.description,
    cta: "",
  };

  // Mark entry as PROCESSING and create tracking job
  const aiJob = await prisma.aIJob.create({
    data: {
      type: "CONTENT_GENERATION",
      status: JobStatus.PROCESSING,
      payload: { calendarEntryId, contentType: entry.type } as object,
      companyId: entry.companyId,
    },
  });

  await prisma.contentCalendar.update({
    where: { id: calendarEntryId },
    data: { status: JobStatus.PROCESSING },
  });

  try {
    const company = entry.company;

    // Step 1: generate caption + hashtags
    const captionCtx: CaptionContext = {
      companyName: company.name,
      niche: company.niche,
      city: company.city,
      tone: company.tone,
      brandTone: strategyContent.brandTone,
      postTitle: postIdea.title,
      postObjective: postIdea.objective,
      postFormat: entry.type,
      postHook: postIdea.hook,
      postDescription: postIdea.description,
      postCta: postIdea.cta,
    };

    const { caption, hashtags } = await generateCaption(captionCtx);
    const hashtagString = hashtags.map((h) => `#${h}`).join(" ");

    // Step 2: generate media
    const mediaInput = {
      companyName: company.name,
      niche: company.niche,
      postTitle: postIdea.title,
      postDescription: postIdea.description,
      brandTone: strategyContent.brandTone,
      format: entry.type,
    };

    let mediaUrl: string | null = null;
    let mediaFallbackReason: string | undefined;

    try {
      if (entry.type === ContentType.REEL) {
        const videoResult = await generateVideo({
          companyName: company.name,
          niche: company.niche,
          postTitle: postIdea.title,
          postDescription: postIdea.description,
        });

        if (videoResult.available) {
          const uploaded = await uploadMedia(videoResult.base64, videoResult.mimeType);
          mediaUrl = uploaded.publicUrl;
        } else {
          // Fallback: static image for REEL when Veo is unavailable.
          mediaFallbackReason = videoResult.reason;
          const imageResult = await generateImage(mediaInput);
          const uploaded = await uploadMedia(imageResult.base64, imageResult.mimeType);
          mediaUrl = uploaded.publicUrl;
        }
      } else {
        const imageResult = await generateImage(mediaInput);
        const uploaded = await uploadMedia(imageResult.base64, imageResult.mimeType);
        mediaUrl = uploaded.publicUrl;
      }
    } catch (mediaErr) {
      // Image/video generation unavailable (quota, billing, model access).
      // Post is still saved with caption + hashtags; mediaUrl stays null.
      const msg = (mediaErr as Error).message ?? "";
      const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("billing");
      if (!isQuota) throw mediaErr; // re-throw unexpected errors
    }

    // Step 3: persist Post
    await prisma.post.upsert({
      where: { calendarId: calendarEntryId },
      create: {
        type: entry.type,
        caption,
        hashtags: hashtagString,
        mediaUrl,
        status: JobStatus.DONE,
        companyId: entry.companyId,
        calendarId: calendarEntryId,
      },
      update: {
        caption,
        hashtags: hashtagString,
        mediaUrl,
        status: JobStatus.DONE,
      },
    });

    // Step 4: mark calendar entry and job as DONE
    const updatedEntry = await prisma.contentCalendar.update({
      where: { id: calendarEntryId },
      data: { status: JobStatus.DONE },
      include: { post: true },
    });

    await prisma.aIJob.update({
      where: { id: aiJob.id },
      data: {
        status: JobStatus.DONE,
        result: {
          postId: updatedEntry.post?.id ?? null,
          ...(mediaFallbackReason ? { mediaFallback: mediaFallbackReason } : {}),
        } as object,
      },
    });

    return updatedEntry;
  } catch (err) {
    await prisma.contentCalendar.update({
      where: { id: calendarEntryId },
      data: { status: JobStatus.FAILED },
    });
    await prisma.aIJob.update({
      where: { id: aiJob.id },
      data: {
        status: JobStatus.FAILED,
        error: (err as Error).message ?? "Erro desconhecido",
      },
    });
    throw err;
  }
}

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ id: string; status: string; error?: string }>;
}

export async function generateBatch(
  prisma: PrismaClient,
  userId: string
): Promise<BatchResult> {
  const company = await findUserCompany(prisma, userId);
  if (!company) throw makeError("Nenhuma empresa cadastrada.", 404);

  const pendingEntries = await prisma.contentCalendar.findMany({
    where: { companyId: company.id, status: JobStatus.PENDING },
    orderBy: { date: "asc" },
  });

  if (pendingEntries.length === 0) {
    throw makeError("Nenhuma entrada pendente para gerar conteúdo.", 422);
  }

  let succeeded = 0;
  let failed = 0;
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const e of pendingEntries) {
    try {
      await generatePostContent(prisma, userId, e.id);
      succeeded++;
      results.push({ id: e.id, status: "DONE" });
    } catch (err) {
      failed++;
      results.push({ id: e.id, status: "FAILED", error: (err as Error).message });
    }
  }

  return { total: pendingEntries.length, succeeded, failed, results };
}
