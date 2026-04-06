import { PrismaClient, NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  companyId?: string;
  type: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(
  prisma: PrismaClient,
  data: CreateNotificationInput,
) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      companyId: data.companyId ?? null,
      type: data.type,
      title: data.title,
      message: data.message,
    },
  });
}

export async function listNotifications(prisma: PrismaClient, userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markAsRead(
  prisma: PrismaClient,
  notificationId: string,
  userId: string,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw { statusCode: 404, message: "Notificação não encontrada." };
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(prisma: PrismaClient, userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function countUnread(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
