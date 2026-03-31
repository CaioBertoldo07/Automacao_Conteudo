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
