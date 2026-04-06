import { CheckCircle2, Calendar, AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Notification, NotificationType } from "@/types";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  CONTENT_READY: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  CALENDAR_UPDATED: {
    icon: Calendar,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  AUTOMATION_ERROR: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-3 transition-colors",
        notification.read ? "opacity-60" : "bg-muted/40",
      )}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
        {timeAgo(notification.createdAt)}
      </span>
    </div>
  );
}

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
}

export function NotificationPanel({ notifications, isLoading }: NotificationPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Bell className="h-8 w-8 opacity-40" />
        <p className="text-sm">Nenhuma notificação</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
    </div>
  );
}
