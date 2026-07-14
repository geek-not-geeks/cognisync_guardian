import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { DailyCalibrationsRow } from "@/types/database.types";

interface GovernorLockoutState {
  isLocked: boolean;
  rows: DailyCalibrationsRow[];
  loading: boolean;
}

export function useGovernorLockout(): GovernorLockoutState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["daily_calibrations_last3", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DailyCalibrationsRow[]> => {
      const { data, error } = await supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", userId!)
        .order("date", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data as DailyCalibrationsRow[] | null) ?? [];
    },
  });

  const rows = data ?? [];
  const isLocked =
    rows.length === 3 &&
    rows.every((r) => r.energy_baseline === 1 || r.sleep_quality < 4);

  return { isLocked, rows, loading: isLoading };
}
