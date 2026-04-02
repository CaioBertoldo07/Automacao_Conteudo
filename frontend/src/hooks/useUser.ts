import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/api";

export const USER_KEYS = {
  me: ["user", "me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: USER_KEYS.me,
    queryFn: () => userService.getMe(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) => userService.updateMe(data),
    onSuccess: (updatedUser) => {
      qc.setQueryData(USER_KEYS.me, updatedUser);
      // Sync the localStorage cache used by useAuth().getUser()
      const raw = localStorage.getItem("user");
      if (raw) {
        const cached = JSON.parse(raw);
        localStorage.setItem("user", JSON.stringify({ ...cached, ...updatedUser }));
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(currentPassword, newPassword),
  });
}
