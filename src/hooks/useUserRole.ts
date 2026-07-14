import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/database.types";

interface UserRoleState {
  role: UserRole | null;
  parentId: string | null;
  loading: boolean;
}

export function useUserRole(): UserRoleState {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["users", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("role, parent_id")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as { role: UserRole; parent_id: string | null } | null;
    },
  });

  return {
    role: data?.role ?? null,
    parentId: data?.parent_id ?? null,
    loading: authLoading || (!!userId && isLoading),
  };
}
