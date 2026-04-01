import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contentService } from "@/services/api";
import { CALENDAR_KEYS } from "./useCalendar";

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (calendarEntryId: string) =>
      contentService.generateOne(calendarEntryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR_KEYS.me }),
  });
}

export function useGenerateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => contentService.generateBatch(),
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR_KEYS.me }),
  });
}
