import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { strategyService } from "@/services/api";

export const STRATEGY_KEYS = {
  me: ["strategy", "me"] as const,
};

export function useMyStrategy() {
  return useQuery({
    queryKey: STRATEGY_KEYS.me,
    queryFn: () => strategyService.getMyStrategy(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useGenerateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => strategyService.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STRATEGY_KEYS.me });
    },
  });
}

export function useApproveStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => strategyService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STRATEGY_KEYS.me });
    },
  });
}

export function useRejectStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      strategyService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STRATEGY_KEYS.me });
    },
  });
}
