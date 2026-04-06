import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { automationService } from "@/services/api";
import type { UpdateAutomationConfigRequest } from "@/types";

export const AUTOMATION_KEYS = {
  config: ["automation", "config"] as const,
};

export function useAutomationConfig() {
  return useQuery({
    queryKey: AUTOMATION_KEYS.config,
    queryFn: () => automationService.getConfig(),
    staleTime: 1000 * 60,
  });
}

export function useUpdateAutomationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAutomationConfigRequest) =>
      automationService.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTOMATION_KEYS.config });
    },
  });
}

export function useTriggerAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => automationService.trigger(),
    onSuccess: () => {
      // Invalidate data likely changed by the automation cycle
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
