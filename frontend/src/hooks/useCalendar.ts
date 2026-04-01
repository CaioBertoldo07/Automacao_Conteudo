import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarService } from "@/services/api";

export const CALENDAR_KEYS = {
  me: ["calendar", "me"] as const,
};

export function useMyCalendar() {
  return useQuery({
    queryKey: CALENDAR_KEYS.me,
    queryFn: () => calendarService.getMyCalendar(),
    staleTime: 1000 * 60 * 5,
    // Phase 6: auto-poll every 3s while any entry is being processed by a worker.
    refetchInterval: (query) => {
      const entries = query.state.data;
      if (!entries) return false;
      const hasProcessing = entries.some((e) => e.status === "PROCESSING");
      return hasProcessing ? 3_000 : false;
    },
  });
}

export function useGenerateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calendarService.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEYS.me });
    },
  });
}

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEYS.me });
    },
  });
}
