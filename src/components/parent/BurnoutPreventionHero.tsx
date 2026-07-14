import type { DailyCalibrationsRow } from "@/types/database.types";

export function BurnoutPreventionHero({ rows }: { rows: DailyCalibrationsRow[] }) {
  const total = rows.length;
  const green = rows.filter((r) => r.burnout_tier === "Green").length;
  const score = total > 0 ? Math.round((green / total) * 100) : 0;

  return (
    <div className="rounded-4xl bg-surface p-8 shadow-3d-base">
      <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
        Trailing 7 Days
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        Burnout Prevention Score
      </h2>
      <div className="mt-6 flex items-baseline gap-3">
        <span className="text-6xl font-bold text-accent-mint">{score}</span>
        <span className="text-2xl font-semibold text-text-secondary">%</span>
      </div>
      <p className="mt-3 text-sm text-text-secondary">
        {green} of {total || 0} days in a sustainable Green State.
      </p>
    </div>
  );
}
