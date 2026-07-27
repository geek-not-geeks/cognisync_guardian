import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { MacroScoreRing } from "@/components/dashboard/MacroScoreRing";
import { GovernorLockoutPanel } from "@/components/dashboard/GovernorLockoutPanel";
import { BiometricsCard } from "@/components/dashboard/BiometricsCard";
import { GovernorTimeline } from "@/components/dashboard/GovernorTimeline";
import { useGovernorLockout } from "@/hooks/useGovernorLockout";
import { calculateBurnoutTier } from "@/lib/burnoutEngine";
import type { BurnoutTier, DailyCalibrationsRow } from "@/types/database.types";



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

  const { data: profile } = useProfile();

  // Trailing 4-day biometrics for the Burnout Engine
  const { data: trailing } = useQuery({
    queryKey: ["daily_calibrations_last4", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DailyCalibrationsRow[]> => {
      const { data, error } = await supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", userId!)
        .order("date", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data as DailyCalibrationsRow[] | null) ?? [];
    },
  });

  const burnout = useMemo(() => {
    const rows = trailing ?? [];
    const study = rows.length
      ? rows.map((r) => Number(r.available_study_hours ?? 0))
      : [6, 5.5, 7, 6];
    const sleep = rows.length
      ? rows.map((r) => Number(r.sleep_quality ?? 0))
      : [6, 5, 6.5, 5];
    const energy = calibration?.energy_baseline ?? rows[0]?.energy_baseline ?? 6;
    return calculateBurnoutTier(study, sleep, energy);
  }, [trailing, calibration]);

  const ringTier: BurnoutTier =
    burnout.tier === "red" ? "Red" : burnout.tier === "amber" ? "Amber" : "Green";
  const score = burnout.score;


  const metaName = (user?.user_metadata as { display_name?: string } | null)?.display_name;
  const rawName = profile?.display_name || metaName;
  const firstName = rawName ? rawName.trim().split(/\s+/)[0] : "Scholar";
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
            <MacroScoreRing tier={ringTier} score={score} label={burnout.label} />
          )}
          <p
            className={`mt-4 text-center text-xs font-medium ${
              burnout.tier === "red"
                ? "text-rose-500"
                : burnout.tier === "amber"
                  ? "text-warning-amber"
                  : "text-accent-mint"
            }`}
          >
            {burnout.actionTaken ?? "Trailing 4-day load within sustainable limits."}
          </p>
          {!isLoading && !calibration && (
            <p className="mt-2 text-center text-xs text-text-secondary">
              Complete your morning calibration to refine today's score.
            </p>
          )}

        </div>
      </div>

      {userId && (
        <BiometricsCard
          userId={userId}
          date={today}
          calibration={calibration ?? null}
        />
      )}

      {isLocked && <GovernorLockoutPanel />}

      <section
        className={
          isLocked
            ? "rounded-3xl border-2 border-destructive/70 p-4"
            : undefined
        }
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">Today's Pacing</h2>
        {isLocked ? (
          <p className="text-sm text-text-secondary">
            Calendar is locked. Only maintenance slots above are available.
          </p>
        ) : userId ? (
          <GovernorTimeline
            userId={userId}
            targetHours={(profile?.target_study_hours ?? 6) * burnout.capacityMultiplier}

            sleepHours={calibration?.sleep_quality}
            energyLevel={calibration?.energy_baseline}
          />
        ) : null}
      </section>
    </div>
  );
}


