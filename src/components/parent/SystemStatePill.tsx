import type { BurnoutTier } from "@/types/database.types";

const STATE_META: Record<
  BurnoutTier,
  { label: string; color: string; bg: string }
> = {
  Green: {
    label: "Sustainable",
    color: "var(--color-accent-mint)",
    bg: "color-mix(in oklab, var(--color-accent-mint) 15%, transparent)",
  },
  Amber: {
    label: "Load Warning",
    color: "var(--color-warning-amber)",
    bg: "color-mix(in oklab, var(--color-warning-amber) 15%, transparent)",
  },
  Red: {
    label: "Governor Cap Active",
    color: "var(--color-destructive, #ef4444)",
    bg: "color-mix(in oklab, var(--color-destructive, #ef4444) 15%, transparent)",
  },
};

export function SystemStatePill({ tier }: { tier: BurnoutTier | null }) {
  const meta = tier
    ? STATE_META[tier]
    : { label: "No Data", color: "var(--color-slate-700, #334155)", bg: "transparent" };

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-3d-base"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </div>
  );
}
