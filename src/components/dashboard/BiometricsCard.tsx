import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BurnoutTier, DailyCalibrationsRow } from "@/types/database.types";

interface Props {
  userId: string;
  date: string;
  calibration: DailyCalibrationsRow | null;
}

function computeTier(sleep: number, energy: number): BurnoutTier {
  if (energy <= 3 || sleep <= 4) return "Red";
  if (energy >= 7 && sleep >= 7) return "Green";
  return "Amber";
}

function energyBadge(energy: number): { label: string; className: string } {
  if (energy <= 3)
    return { label: "Drained", className: "bg-governor-red/20 text-governor-red" };
  if (energy <= 6)
    return { label: "Steady", className: "bg-warning-amber/20 text-warning-amber" };
  return { label: "Peak", className: "bg-accent-mint/20 text-accent-mint" };
}

export function BiometricsCard({ userId, date, calibration }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<boolean>(!calibration);
  const [sleep, setSleep] = useState<number>(calibration?.sleep_quality ?? 7);
  const [energy, setEnergy] = useState<number>(calibration?.energy_baseline ?? 6);

  useEffect(() => {
    if (calibration) {
      setSleep(calibration.sleep_quality);
      setEnergy(calibration.energy_baseline);
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [calibration]);

  const commit = useMutation({
    mutationFn: async () => {
      const tier = computeTier(sleep, energy);
      const payload = {
        user_id: userId,
        date,
        sleep_quality: sleep,
        energy_baseline: energy,
        available_study_hours: calibration?.available_study_hours ?? 0,
        burnout_tier: tier,
      };
      const { error } = await supabase
        .from("daily_calibrations")
        .upsert(payload as never, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Calibration committed");
      await qc.invalidateQueries({ queryKey: ["daily_calibrations", userId, date] });
      setEditing(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to save calibration");
    },
  });

  const badge = energyBadge(energy);

  if (!editing && calibration) {
    const readBadge = energyBadge(calibration.energy_baseline);
    return (
      <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
              Daily Biometrics
            </p>
            <div className="mt-3 flex items-baseline gap-6">
              <div>
                <p className="text-xs text-text-secondary">Sleep</p>
                <p className="text-xl font-semibold text-foreground">
                  {calibration.sleep_quality} Hours
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Energy</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${readBadge.className}`}
                >
                  {readBadge.label} · {calibration.energy_baseline}/10
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit biometrics"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-deep text-text-secondary shadow-3d-base transition-all active:scale-95 active:shadow-3d-pressed"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
      <p className="text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        Morning Calibration
      </p>

      <div className="mt-5 space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="sleep-slider" className="text-xs text-text-secondary">
              Sleep Hours
            </label>
            <span className="text-lg font-semibold text-foreground">
              {sleep.toFixed(1)} Hours
            </span>
          </div>
          <input
            id="sleep-slider"
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={sleep}
            onChange={(e) => setSleep(Number(e.target.value))}
            className="mt-2 w-full accent-accent-mint"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="energy-slider" className="text-xs text-text-secondary">
              Energy Level
            </label>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
            >
              {badge.label} · {energy}/10
            </span>
          </div>
          <input
            id="energy-slider"
            type="range"
            min={1}
            max={10}
            step={1}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="mt-2 w-full accent-accent-mint"
          />
        </div>

        <button
          type="button"
          onClick={() => commit.mutate()}
          disabled={commit.isPending}
          className="w-full rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
        >
          {commit.isPending ? "Committing…" : "Commit Calibration"}
        </button>
      </div>
    </div>
  );
}
