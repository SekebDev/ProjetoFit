import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileInput } from "@workout/shared";
import { apiFetch } from "@/lib/api";

export function useProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<Profile | null>("/profile"),
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<Profile>("/profile", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => qc.setQueryData(["profile"], data),
  });
}
