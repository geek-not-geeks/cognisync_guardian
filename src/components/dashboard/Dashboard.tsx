import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { MacroScoreRing } from "@/components/dashboard/MacroScoreRing";
import { GovernorLockoutPanel } from "@/components/dashboard/GovernorLockoutPanel";
import { useGovernorLockout } from "@/hooks/useGovernorLockout";
import type { DailyCalibrationsRow, UsersRow } from "@/types/database.types";

function greetingFor(date: Date): "Morning" | "Afternoon" | "Evening" {
  const h = date.getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}


function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const { user } = useAuth();
  const { isLocked } = useGovernorLockout();

  const userId = user?.id ?? null;
  const today = todayISO();

  const { data: calibration, isLoading } = useQuery({
    queryKey: ["daily_calibrations", userId, today],
    enabled: !!userId,
    queryFn: async (): Promise<DailyCalibrationsRow | null> => {
      const { data, error } = await supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", userId!)
        .eq("date", today)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as DailyCalibrationsRow | null) ?? null;
    },
  });

  const { data: taskCount } = useQuery({
    queryKey: ["tasks_count", userId, "pending"],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["users", userId, "profile"],
    enabled: !!userId,
    queryFn: async (): Promise<Pick<UsersRow, "display_name"> | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Pick<UsersRow, "display_name"> | null) ?? null;
    },
  });

  const tier = calibration?.burnout_tier ?? null;
  const score = calibration ? Math.round((calibration.energy_baseline ?? 0) * 10) : 0;
  const sleep = calibration?.sleep_quality != null ? `${calibration.sleep_quality}/10` : "—";
  const energyLabel = calibration
    ? calibration.energy_baseline >= 7
      ? "High"
      : calibration.energy_baseline >= 4
        ? "Steady"
        : "Low"
    : "—";

  const firstName = profile?.display_name?.split(" ")[0] || "Scholar";
  const greeting = greetingFor(new Date());

  return (
    <div className="space-y-6 p-4">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
          CogniSync
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          {greeting}, {firstName}
        </h1>
      </header>

      <div className="rounded-3xl bg-surface p-6 shadow-3d-base">
        <div className="flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="h-48 w-48 animate-pulse rounded-full bg-slate-deep/40" />
          ) : (
            <MacroScoreRing tier={tier} score={score} />
          )}
          {!isLoading && !calibration && (
            <p className="mt-4 text-center text-xs text-text-secondary">
              Complete your morning calibration to see today's score.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Sleep</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{sleep}</p>
        </div>
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Tasks</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{taskCount ?? 0}</p>
        </div>
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Energy</p>
          <p className="mt-0.5 text-sm font-semibold text-accent-mint">{energyLabel}</p>
        </div>
      </div>

      {isLocked && <GovernorLockoutPanel />}

      <section
        className={
          isLocked
            ? "rounded-3xl border-2 border-destructive/70 p-4"
            : undefined
        }
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Today's Pacing</h2>
        <p className="text-sm text-text-secondary">
          {isLocked
            ? "Calendar is locked. Only maintenance slots above are available."
            : "Pacing blocks will appear once the Governor schedules today's work."}
        </p>
      </section>
    </div>
  );
}

