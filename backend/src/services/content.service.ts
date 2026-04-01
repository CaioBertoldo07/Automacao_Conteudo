import {
  PrismaClient,
  ContentType,
  JobStatus,
  StrategyApprovalStatus,
} from "@prisma/client";
import type { StrategyContent } from "../agents/claude.agent";
import { generateCaption, type CaptionContext } from "../agents/content.agent";
import { generateImage } from "../agents/image.adapter";
import { generateVideo } from "../agents/video.adapter";
import { uploadMedia } from "../utils/storage";
import { contentQueue } from "../queues/content.queue";

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

async function findUserCompany(prisma: PrismaClient, userId: string) {
  return prisma.company.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Enqueue (API layer) ────────────────────────────────────────────────────

export interface EnqueueResult {
  aiJobId: string;
  queueJobId: string;
  calendarEntryId: string;
}

/**
 * Validates the calendar entry, creates an AIJob (PENDING), marks the entry as
 * PROCESSING for immediate UI feedback, and pushes a job onto the BullMQ queue.
 *
 * Rollback on queue failure:
 *   If contentQueue.add() throws (e.g. Redis unreachable), both DB writes are
 *   compensated via Promise.allSettled so neither state is left inconsistent:
 *   - AIJob → FAILED  (preserves audit trail)
 *   - ContentCalendar → PENDING  (allows the user to retry)
 */
export async function enqueuePostContent(
  prisma: PrismaClient,
  userId: string,
  calendarEntryId: string
): Promise<EnqueueResult> {
  // Step 1 — read entry for ownership + strategy validation.
  const entry = await prisma.contentCalendar.findUnique({
    where: { id: calendarEntryId },
    include: { company: { include: { contentStrategy: true } } },
  });

  if (!entry) throw makeError("Entrada de calendário não encontrada.", 404);
  if (entry.company.userId !== userId) throw makeError("Acesso negado.", 403);

  // Fast-path exits for terminal/active states (non-concurrent reads).
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

  // Step 2 — atomic claim: mark as PROCESSING only if the row is still
  // PENDING or FAILED. Using updateMany with a status filter means two
  // concurrent requests cannot both succeed — only the first one gets
  // count === 1; the second gets count === 0 and is rejected.
  const { count } = await prisma.contentCalendar.updateMany({
    where: { id: calendarEntryId, status: { in: [JobStatus.PENDING, JobStatus.FAILED] } },
    data: { status: JobStatus.PROCESSING },
  });

  if (count === 0) {
    // Lost the race — re-read to surface a precise error message.
    const current = await prisma.contentCalendar.findUnique({
      where: { id: calendarEntryId },
      select: { status: true },
    });
    const s = current?.status;
    if (s === JobStatus.DONE) throw makeError("Conteúdo já foi gerado para esta entrada.", 422);
    if (s === JobStatus.PROCESSING) throw makeError("Geração já em andamento para esta entrada.", 422);
    throw makeError("Entrada não pode ser enfileirada no momento.", 409);
  }

  // Step 3 — create AIJob AFTER the claim succeeds (no orphan jobs on race loss).
  const aiJob = await prisma.aIJob.create({
    data: {
      type: "CONTENT_GENERATION",
      status: JobStatus.PENDING,
      payload: { calendarEntryId, contentType: entry.type } as object,
      companyId: entry.companyId,
    },
  });

  // Step 4 — push to BullMQ. On failure: roll back both DB writes.
  let queueJob;
  try {
    queueJob = await contentQueue.add("generate", {
      aiJobId: aiJob.id,
      calendarEntryId,
      userId,
    });
  } catch (queueErr) {
    await Promise.allSettled([
      prisma.aIJob.update({
        where: { id: aiJob.id },
        data: {
          status: JobStatus.FAILED,
          error: `Falha ao enfileirar: ${(queueErr as Error).message}`,
        },
      }),
      prisma.contentCalendar.update({
        where: { id: calendarEntryId },
        data: { status: JobStatus.PENDING }, // restored → user can retry
      }),
    ]);
    throw makeError("Serviço de fila indisponível. Tente novamente.", 503);
  }

  return { aiJobId: aiJob.id, queueJobId: queueJob.id!, calendarEntryId };
}

// ─── Batch enqueue ──────────────────────────────────────────────────────────

export interface BatchEnqueueItemResult {
  calendarEntryId: string;
  aiJobId?: string;
  status: "queued" | "failed";
  error?: string;
}

export interface BatchEnqueueResult {
  total: number;
  queued: number;
  failed: number;
  items: BatchEnqueueItemResult[];
}

export async function enqueueBatch(
  prisma: PrismaClient,
  userId: string
): Promise<BatchEnqueueResult> {
  const company = await findUserCompany(prisma, userId);
  if (!company) throw makeError("Nenhuma empresa cadastrada.", 404);

  const pendingEntries = await prisma.contentCalendar.findMany({
    where: { companyId: company.id, status: JobStatus.PENDING },
    orderBy: { date: "asc" },
  });

  if (pendingEntries.length === 0) {
    throw makeError("Nenhuma entrada pendente para gerar conteúdo.", 422);
  }

  const items: BatchEnqueueItemResult[] = [];

  for (const e of pendingEntries) {
    try {
      const { aiJobId } = await enqueuePostContent(prisma, userId, e.id);
      items.push({ calendarEntryId: e.id, aiJobId, status: "queued" });
    } catch (err) {
      // Capture per-item failure so caller gets full audit trail.
      // enqueuePostContent already rolled back DB state on queue failure.
      items.push({
        calendarEntryId: e.id,
        status: "failed",
        error: (err as Error).message ?? "Erro desconhecido ao enfileirar",
      });
    }
  }

  const queued = items.filter((i) => i.status === "queued").length;
  const failed = items.filter((i) => i.status === "failed").length;

  return { total: pendingEntries.length, queued, failed, items };
}

// ─── Job status ─────────────────────────────────────────────────────────────

export interface AIJobStatusResult {
  id: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
}

export async function getJobStatus(
  prisma: PrismaClient,
  aiJobId: string,
  userId: string
): Promise<AIJobStatusResult> {
  const job = await prisma.aIJob.findFirst({
    where: { id: aiJobId, company: { userId } },
  });

  if (!job) throw makeError("Job não encontrado.", 404);

  return {
    id: job.id,
    status: job.status,
    result: job.result as Record<string, unknown> | null,
    error: job.error ?? null,
  };
}

// ─── Process (Worker layer) ─────────────────────────────────────────────────

/**
 * Shared helper to atomically mark a job + calendar entry as FAILED.
 * Decision: FAILED (not PENDING) because the issue occurred during processing
 * and is auditable — the user should see it failed and understand why.
 */
async function markJobFailed(
  prisma: PrismaClient,
  aiJobId: string,
  calendarEntryId: string,
  reason: string
): Promise<void> {
  await Promise.allSettled([
    prisma.aIJob.update({
      where: { id: aiJobId },
      data: { status: JobStatus.FAILED, error: reason },
    }),
    prisma.contentCalendar.update({
      where: { id: calendarEntryId },
      data: { status: JobStatus.FAILED },
    }),
  ]);
}

/**
 * Contains the actual content generation logic. Called exclusively by the
 * BullMQ worker. Receives an already-created aiJobId and updates it in-place.
 * Never creates a new AIJob.
 */
export async function processPostContent(
  prisma: PrismaClient,
  aiJobId: string,
  calendarEntryId: string,
  _userId: string
): Promise<void> {
  // Transition AIJob to PROCESSING.
  await prisma.aIJob.update({
    where: { id: aiJobId },
    data: { status: JobStatus.PROCESSING },
  });

  // Re-fetch entry with all relations needed for generation.
  let entry;
  try {
    entry = await prisma.contentCalendar.findUnique({
      where: { id: calendarEntryId },
      include: {
        company: { include: { brandProfile: true, contentStrategy: true } },
      },
    });
  } catch (err) {
    await markJobFailed(prisma, aiJobId, calendarEntryId, (err as Error).message);
    throw err;
  }

  // ── Business-rule guards ────────────────────────────────────────────────
  // These conditions can change between enqueue time and processing time.
  // Decision: mark FAILED (not PENDING) — the user needs an explicit signal
  // that something changed, so they can fix it and re-generate deliberately.

  if (!entry) {
    await markJobFailed(
      prisma, aiJobId, calendarEntryId,
      "Entrada de calendário não encontrada."
    );
    return;
  }

  const strategy = entry.company.contentStrategy;

  if (!strategy) {
    await markJobFailed(
      prisma, aiJobId, calendarEntryId,
      "Estratégia de conteúdo não encontrada. Gere uma nova estratégia e tente novamente."
    );
    return;
  }

  if (strategy.approvalStatus !== StrategyApprovalStatus.APPROVED) {
    await markJobFailed(
      prisma, aiJobId, calendarEntryId,
      "A estratégia não está mais aprovada. Reaplique a aprovação e tente novamente."
    );
    return;
  }

  // ── Content generation ──────────────────────────────────────────────────
  try {
    const company = entry.company;
    const strategyContent = strategy.content as unknown as StrategyContent;
    const postIdeas = strategyContent.postIdeas ?? [];
    const ideaIndex =
      postIdeas.length > 0 ? (entry.postIdeaIndex ?? 0) % postIdeas.length : 0;
    const postIdea = postIdeas[ideaIndex] ?? {
      title: String(entry.type),
      objective: "Publicação de conteúdo",
      format: entry.type,
      hook: "",
      description: company.description,
      cta: "",
    };

    // Step 1: caption + hashtags
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

    // Step 2: media
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
      const msg = (mediaErr as Error).message ?? "";
      const isQuota =
        msg.includes("429") || msg.includes("quota") || msg.includes("billing");
      if (!isQuota) throw mediaErr;
    }

    // Step 3: persist Post
    const savedPost = await prisma.post.upsert({
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
      update: { caption, hashtags: hashtagString, mediaUrl, status: JobStatus.DONE },
    });

    // Step 4: mark calendar + job as DONE
    await prisma.contentCalendar.update({
      where: { id: calendarEntryId },
      data: { status: JobStatus.DONE },
    });

    await prisma.aIJob.update({
      where: { id: aiJobId },
      data: {
        status: JobStatus.DONE,
        result: {
          postId: savedPost.id,
          ...(mediaFallbackReason ? { mediaFallback: mediaFallbackReason } : {}),
        } as object,
      },
    });
  } catch (err) {
    await markJobFailed(
      prisma, aiJobId, calendarEntryId,
      (err as Error).message ?? "Erro desconhecido"
    );
    throw err;
  }
}
