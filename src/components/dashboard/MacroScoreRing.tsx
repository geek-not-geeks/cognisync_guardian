import type { BurnoutTier } from "@/types/database.types";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const TIER_META: Record<BurnoutTier, { color: string; label: string }> = {
  Green: { color: "var(--color-accent-mint)", label: "Green State" },
  Amber: { color: "var(--color-warning-amber)", label: "Amber State" },
  Red: { color: "var(--color-destructive, #ef4444)", label: "Red State" },
};

interface MacroScoreRingProps {
  tier: BurnoutTier | null;
  score: number; // 0-100
}

export function MacroScoreRing({ tier, score }: MacroScoreRingProps) {
  const meta = tier ? TIER_META[tier] : { color: "var(--color-slate-700, #334155)", label: "No data" };
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = RING_CIRCUMFERENCE * (1 - pct);

  return (
    <div className="relative h-48 w-48">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
        aria-label={`Burnout score ${score}%`}
      >
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className="text-slate-700/30"
        />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          stroke={meta.color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-text-secondary">Score</span>
        <span className="text-3xl font-bold text-foreground">{score}%</span>
        <span className="text-sm font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}
