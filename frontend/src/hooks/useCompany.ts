import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services/api";
import api from "@/services/api";
import type { CreateCompanyRequest, UpdateCompanyRequest } from "@/types";

export const COMPANY_KEYS = {
  profile: ["company", "profile"] as const,
  list: ["company", "list"] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: COMPANY_KEYS.profile,
    queryFn: () => companyService.getMyProfile(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => companyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.list });
    },
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyRequest) => companyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.profile });
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.list });
    },
  });
}

export interface UpdateBrandProfileRequest {
  description?: string;
  targetAudience?: string;
  mainProducts?: string;
  communicationStyle?: string;
  logoUrl?: string;
  brandColors?: string[];
  visualStyle?: string;
}

export function useUpdateBrandProfile(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBrandProfileRequest) =>
      api.patch(`/companies/${companyId}/brand-profile`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.profile });
    },
  });
}
