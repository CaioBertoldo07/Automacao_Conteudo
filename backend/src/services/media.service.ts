import fs from "fs/promises";
import path from "path";
import { PrismaClient, MediaType, type CompanyMedia } from "@prisma/client";
import {
  uploadCompanyMedia as storageUpload,
} from "../utils/storage";
import { analyzeMedia } from "../agents/media.agent";
import { mediaAnalysisQueue } from "../queues/media.queue";
import { env } from "../config/env";

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function mimeToMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp") {
    return MediaType.IMAGE;
  }
  return MediaType.IMAGE;
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export async function uploadCompanyMedia(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<CompanyMedia> {
  // Ownership check
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw makeError("Empresa não encontrada.", 404);
  if (company.userId !== userId) throw makeError("Acesso negado.", 403);

  const { publicUrl, filename } = await storageUpload(buffer, mimeType, companyId);

  const media = await prisma.companyMedia.create({
    data: {
      companyId,
      type: mimeToMediaType(mimeType),
      url: publicUrl,
      filename,
      mimeType,
      aiAnalyzed: false,
    },
  });

  // Enqueue background AI analysis — fire and forget (no await)
  mediaAnalysisQueue
    .add("analyze", { mediaId: media.id })
    .catch((err) => {
      console.error(`[MediaService] Falha ao enfileirar análise para mídia ${media.id}: ${err.message}`);
    });

  return media;
}

// ─── Analyze (Worker layer) ──────────────────────────────────────────────────

export async function analyzeMediaJob(
  prisma: PrismaClient,
  mediaId: string
): Promise<void> {
  const media = await prisma.companyMedia.findUnique({
    where: { id: mediaId },
    include: { company: true },
  });

  if (!media) {
    throw new Error(`Mídia ${mediaId} não encontrada para análise.`);
  }

  // Resolve filesystem path from the public URL.
  // URL format: /media/company-media/<companyId>/<filename>
  // We reconstruct the path relative to MEDIA_DIR.
  const relativePath = media.url.replace(/^\/media\//, "");
  const filepath = path.join(env.mediaDir, relativePath);

  const fileBuffer = await fs.readFile(filepath);
  const base64 = fileBuffer.toString("base64");

  const result = await analyzeMedia({
    base64,
    mimeType: media.mimeType,
    companyName: media.company.name,
    niche: media.company.niche,
  });

  // If detected as logo, update type
  const updatedType = result.category === "logo" ? MediaType.LOGO : media.type;

  await prisma.companyMedia.update({
    where: { id: mediaId },
    data: {
      type: updatedType,
      category: result.category,
      tags: result.tags,
      description: result.description,
      metadata: {
        detectedElements: result.detectedElements,
        dominantColors: result.dominantColors,
        suggestedUse: result.suggestedUse,
      } as object,
      aiAnalyzed: true,
    },
  });
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listCompanyMedia(
  prisma: PrismaClient,
  companyId: string,
  userId: string,
  filters?: { category?: string; type?: MediaType }
): Promise<CompanyMedia[]> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw makeError("Empresa não encontrada.", 404);
  if (company.userId !== userId) throw makeError("Acesso negado.", 403);

  return prisma.companyMedia.findMany({
    where: {
      companyId,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteCompanyMedia(
  prisma: PrismaClient,
  mediaId: string,
  userId: string
): Promise<void> {
  const media = await prisma.companyMedia.findUnique({
    where: { id: mediaId },
    include: { company: true },
  });

  if (!media) throw makeError("Mídia não encontrada.", 404);
  if (media.company.userId !== userId) throw makeError("Acesso negado.", 403);

  // Delete file from filesystem
  const relativePath = media.url.replace(/^\/media\//, "");
  const filepath = path.join(env.mediaDir, relativePath);
  await fs.unlink(filepath).catch(() => {
    // File may already be missing — continue with DB delete
  });

  await prisma.companyMedia.delete({ where: { id: mediaId } });
}

// ─── Get by ID ───────────────────────────────────────────────────────────────

export async function getCompanyMediaById(
  prisma: PrismaClient,
  mediaId: string,
  userId: string
): Promise<CompanyMedia> {
  const media = await prisma.companyMedia.findUnique({
    where: { id: mediaId },
    include: { company: { select: { userId: true } } },
  });

  if (!media) throw makeError("Mídia não encontrada.", 404);
  if (media.company.userId !== userId) throw makeError("Acesso negado.", 403);

  // Return without the included relation (strip company field)
  const { company: _company, ...mediaOnly } = media;
  return mediaOnly;
}

// ─── Toggle active ───────────────────────────────────────────────────────────

export async function toggleCompanyMediaActive(
  prisma: PrismaClient,
  mediaId: string,
  userId: string,
  isActive: boolean
): Promise<CompanyMedia> {
  const media = await prisma.companyMedia.findUnique({
    where: { id: mediaId },
    include: { company: { select: { userId: true } } },
  });

  if (!media) throw makeError("Mídia não encontrada.", 404);
  if (media.company.userId !== userId) throw makeError("Acesso negado.", 403);

  const updated = await prisma.companyMedia.update({
    where: { id: mediaId },
    data: { isActive },
  });

  return updated;
}

// ─── Select for post ─────────────────────────────────────────────────────────

export async function selectMediaForPost(
  prisma: PrismaClient,
  companyId: string,
  preferredCategory?: string
): Promise<CompanyMedia | null> {
  // Try preferred category first — fetch all matches and pick randomly
  if (preferredCategory) {
    const preferred = await prisma.companyMedia.findMany({
      where: { companyId, aiAnalyzed: true, isActive: true, category: preferredCategory },
    });
    if (preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)];
    }
  }

  // Fallback: any analyzed active image (not logo) — random pick
  const images = await prisma.companyMedia.findMany({
    where: { companyId, aiAnalyzed: true, isActive: true, type: MediaType.IMAGE },
  });

  if (images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
}
