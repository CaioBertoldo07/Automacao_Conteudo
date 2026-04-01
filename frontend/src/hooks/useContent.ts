import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contentService, postService } from "@/services/api";
import type { PostsFilter } from "@/types";
import { CALENDAR_KEYS } from "./useCalendar";

export const POST_KEYS = {
  stats: ["posts", "stats"] as const,
  list: (filters: PostsFilter) => ["posts", "list", filters] as const,
};

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (calendarEntryId: string) =>
      contentService.generateOne(calendarEntryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CALENDAR_KEYS.me });
      qc.invalidateQueries({ queryKey: POST_KEYS.stats });
    },
  });
}

export function useGenerateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => contentService.generateBatch(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CALENDAR_KEYS.me });
      qc.invalidateQueries({ queryKey: POST_KEYS.stats });
    },
  });
}

// Two-level polling strategy for stats:
//   Active  (activeJobs > 0 or calendarProcessing > 0) → 5 s  (fast feedback during generation)
//   Idle    (no known activity)                         → 20 s (light background heartbeat so
//             generation started externally — another tab, API call, cron — is detected without
//             requiring a manual refresh)
export function useDashboardStats() {
  return useQuery({
    queryKey: POST_KEYS.stats,
    queryFn: () => postService.getStats(),
    staleTime: 1000 * 30,
    refetchInterval: (query) => {
      const s = query.state.data;
      if (!s) return 20_000;
      return s.activeJobs > 0 || s.calendarProcessing > 0 ? 5_000 : 20_000;
    },
  });
}

/**
 * @param activePolling - when true (caller has confirmed generation is in progress),
 *   polls unconditionally every 3s instead of relying on Post.status === PROCESSING
 *   (posts are only created on success, so PROCESSING never appears in the list).
 */
export function usePosts(filters: PostsFilter = {}, activePolling = false) {
  return useQuery({
    queryKey: POST_KEYS.list(filters),
    queryFn: () => postService.list(filters),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
    refetchInterval: activePolling ? 3_000 : false,
  });
}

