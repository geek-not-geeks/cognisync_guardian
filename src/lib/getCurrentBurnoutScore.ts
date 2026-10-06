import { supabase } from "@/lib/supabase";
import { calculateBurnoutTier } from "@/lib/burnoutEngine";
import type { DailyCalibrationsRow } from "@/types/database.types";

/**
 * Computes the user's current burnout score at the moment a task is being
 * created, so it can be stamped onto the task (burnout_index_at_creation).
 * This is what makes the predictive model multivariate instead of
 * confidence-only — without this, there's no way to ever check whether
 * completion depends on confidence *combined with* how burned out the
 * student was that day, which was the actual original pitch.
 *
 * Deliberately lighter than Dashboard's full computation: uses
 * calculateBurnoutTier's own default workload/target minutes rather than
 * also fetching today's pending-task workload and the user's target study
 * hours. Sleep and energy — the dominant signal in the burnout formula —
 * are still real, fetched data; only the workload-ratio term falls back to
 * a default. Good enough for stamping a real, directionally-correct score
 * at task-creation time without duplicating Dashboard's entire data-fetch
 * chain here.
 */
export async function getCurrentBurnoutScore(userId: string): Promise<number | null> {
  try {
    const todayKey = new Date().toISOString().slice(0, 10);

    const [{ data: today }, { data: trailing }] = await Promise.all([
      supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", userId)
        .eq("date", todayKey)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(4),
    ]);

    const rows = ([...((trailing as DailyCalibrationsRow[] | null) ?? [])]).reverse();
    const sleep = rows.length
      ? rows.map((r) => Number(r.sleep_quality ?? 0))
      : [6, 5, 6.5, 5];
    const calibration = today as DailyCalibrationsRow | null;
    if (calibration) {
      sleep[sleep.length - 1] = Number(calibration.sleep_quality ?? 0);
    }
    const study = rows.length
      ? rows.map(() => 6) // workload history isn't needed for this approximation
      : [6, 5.5, 7, 6];
    const energy = calibration?.energy_baseline ?? rows[rows.length - 1]?.energy_baseline ?? 6;

    const result = calculateBurnoutTier(study, sleep, energy);
    return result.score;
  } catch {
    // Never let a burnout-score lookup block task creation — the task
    // still saves, just without this optional field.
    return null;
  }
}
