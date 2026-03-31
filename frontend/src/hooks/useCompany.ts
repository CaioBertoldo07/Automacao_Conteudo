import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services/api";
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
