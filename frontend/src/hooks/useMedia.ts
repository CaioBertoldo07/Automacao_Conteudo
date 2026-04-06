import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaService } from "@/services/api";
import type { CompanyMedia, MediaType } from "@/types";

export type { CompanyMedia, MediaType };

export const MEDIA_KEYS = {
  list: (companyId: string, filters?: object) =>
    ["media", companyId, filters] as const,
};

export function useCompanyMedia(
  companyId: string,
  filters?: { category?: string; type?: MediaType }
) {
  return useQuery({
    queryKey: MEDIA_KEYS.list(companyId, filters),
    queryFn: () => mediaService.list(companyId, filters),
    enabled: !!companyId,
    staleTime: 1000 * 30,
    refetchInterval: (query) =>
      query.state.data?.some((m) => !m.aiAnalyzed) ? 3000 : false,
  });
}

export function useUploadMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => mediaService.upload(companyId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}

export function useGetMedia(companyId: string, mediaId: string | null) {
  return useQuery({
    queryKey: ["media", companyId, mediaId],
    queryFn: () => mediaService.get(companyId, mediaId!),
    enabled: !!companyId && !!mediaId,
    // Poll every 3 s while AI analysis is still pending; stop when done.
    refetchInterval: (query) =>
      query.state.data?.aiAnalyzed ? false : 3000,
  });
}

export function useToggleMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, isActive }: { mediaId: string; isActive: boolean }) =>
      mediaService.toggle(companyId, mediaId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}

export function useDeleteMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => mediaService.remove(companyId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}

export function useRequeueMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mediaService.requeue(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}
