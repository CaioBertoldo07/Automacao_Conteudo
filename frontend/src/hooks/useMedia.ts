import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

export type MediaType = "IMAGE" | "VIDEO" | "LOGO";

export interface CompanyMedia {
  id: string;
  companyId: string;
  type: MediaType;
  url: string;
  filename: string;
  mimeType: string;
  category: string | null;
  tags: string[];
  description: string | null;
  metadata: Record<string, unknown> | null;
  aiAnalyzed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.category) params.category = filters.category;
      if (filters?.type) params.type = filters.type;
      const response = await api.get<CompanyMedia[]>(
        `/companies/${companyId}/media`,
        { params }
      );
      return response.data;
    },
    enabled: !!companyId,
    staleTime: 1000 * 30,
  });
}

export function useUploadMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post<CompanyMedia>(
        `/companies/${companyId}/media`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}

export function useGetMedia(companyId: string, mediaId: string | null) {
  return useQuery({
    queryKey: ["media", companyId, mediaId],
    queryFn: async () => {
      const response = await api.get<CompanyMedia>(
        `/companies/${companyId}/media/${mediaId}`
      );
      return response.data;
    },
    enabled: !!companyId && !!mediaId,
    // Poll every 3 s while AI analysis is still pending; stop when done.
    refetchInterval: (query) =>
      query.state.data?.aiAnalyzed ? false : 3000,
  });
}

export function useToggleMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, isActive }: { mediaId: string; isActive: boolean }) => {
      const response = await api.patch<CompanyMedia>(
        `/companies/${companyId}/media/${mediaId}`,
        { isActive }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}

export function useDeleteMedia(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      await api.delete(`/companies/${companyId}/media/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", companyId] });
    },
  });
}
