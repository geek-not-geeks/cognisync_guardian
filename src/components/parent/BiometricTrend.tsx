import type { DailyCalibrationsRow } from "@/types/database.types";

interface Props {
  rows: DailyCalibrationsRow[]; // newest first
}

const W = 320;
const H = 140;
const PAD = 16;

function buildPath(values: number[], max: number): string {
  if (values.length === 0) return "";
  const stepX = (W - PAD * 2) / Math.max(1, values.length - 1);
  return values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - ((v / max) * (H - PAD * 2));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function BiometricTrend({ rows }: Props) {
  const chrono = [...rows].reverse();
  const sleep = chrono.map((r) => r.sleep_quality);
  const hours = chrono.map((r) => r.available_study_hours);

  const sleepPath = buildPath(sleep, 10);
  const hoursMax = Math.max(8, ...hours, 1);
  const hoursPath = buildPath(hours, hoursMax);

  return (
    <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Biometric Trend
        </h3>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent-mint" /> Sleep
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning-amber" /> Study hrs
          </span>
        </div>
      </div>
      {chrono.length === 0 ? (
        <p className="text-sm text-text-secondary">No calibration data yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full">
          <path
            d={sleepPath}
            fill="none"
            stroke="var(--color-accent-mint)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={hoursPath}
            fill="none"
            stroke="var(--color-warning-amber)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
