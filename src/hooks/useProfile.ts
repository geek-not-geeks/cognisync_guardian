import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { UsersRow } from "@/types/database.types";

type ProfileSlice = Pick<
  UsersRow,
  "id" | "role" | "timezone" | "display_name" | "target_study_hours"
>;

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<ProfileSlice | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, role, timezone, display_name, target_study_hours")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileSlice | null) ?? null;
    },
  });
}
