import { User } from "lucide-react";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_PROGRESS = 0.85;
const RING_OFFSET = RING_CIRCUMFERENCE * (1 - RING_PROGRESS);

export function Dashboard() {
  return (
    <div className="space-y-6 p-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            CogniSync
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Morning</h1>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-3d-base">
          <User className="h-7 w-7 text-text-secondary" strokeWidth={2} />
        </div>
      </header>

      {/* Macro Burnout Score Card */}
      <div className="rounded-3xl bg-surface p-6 shadow-3d-base">
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-48 w-48">
            <svg
              className="h-full w-full -rotate-90"
              viewBox="0 0 120 120"
              aria-label="Burnout score 85%"
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
                stroke="var(--color-accent-mint)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_OFFSET}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-text-secondary">Score</span>
              <span className="text-3xl font-bold text-foreground">85%</span>
              <span className="text-sm font-semibold text-accent-mint">Green State</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Sleep</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">8h</p>
        </div>
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Tasks</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">4</p>
        </div>
        <div className="rounded-full bg-surface px-2 py-4 text-center shadow-3d-base">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Energy</p>
          <p className="mt-0.5 text-sm font-semibold text-accent-mint">High</p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Today's Pacing</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-3d-base">
            <span className="h-3 w-3 rounded-full bg-accent-mint" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Quick review</p>
              <p className="text-xs text-text-secondary">15 min • Low effort</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-3d-base">
            <span className="h-3 w-3 rounded-full bg-warning-amber" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Deep work block</p>
              <p className="text-xs text-text-secondary">90 min • Standard effort</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-3d-base">
            <span className="h-3 w-3 rounded-full bg-accent-mint" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Email triage</p>
              <p className="text-xs text-text-secondary">20 min • Low effort</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
