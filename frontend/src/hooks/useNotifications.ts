import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/api";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.all,
    queryFn: () => notificationService.list(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  const hasUnread = notifications?.some((n) => !n.read) ?? false;

  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: () => notificationService.unreadCount(),
    staleTime: 1000 * 15,
    refetchInterval: hasUnread ? 1000 * 15 : 1000 * 30,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
    },
  });
}
