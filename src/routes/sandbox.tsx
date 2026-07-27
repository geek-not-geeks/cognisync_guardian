import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Coffee, Timer, ArrowRight } from "lucide-react";
import { generateDailySchedule, type GovernorTaskInput } from "@/lib/governorEngine";
import { calculateBurnoutTier } from "@/lib/burnoutEngine";
import { MacroScoreRing } from "@/components/dashboard/MacroScoreRing";
import { PostponedTray } from "@/components/dashboard/PostponedTray";
import type { BurnoutTier } from "@/types/database.types";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "60-Second Sandbox — CogniSync" },
      {
        name: "description",
        content:
          "Drag sleep and energy sliders to watch the CogniSync Governor rebuild a burnout-safe study schedule in real time.",
      },
      { property: "og:title", content: "60-Second Sandbox — CogniSync" },
      {
        property: "og:description",
        content:
          "See how the CogniSync Governor Engine protects your schedule from burnout — no signup required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SandboxPage,
});

const MOCK_TASKS: GovernorTaskInput[] = [
  {
    id: "mock-1",
    title: "Advanced Quantum Mechanics Worksheet",
    effortSize: "Deep Work",
    difficulty: "Very Hard",
    deadline: null,
  },
  {
    id: "mock-2",
    title: "French Vocabulary Flashcards",
    effortSize: "Quick",
    difficulty: "Comfortable",
    deadline: null,
  },
  {
    id: "mock-3",
    title: "History Thesis Outline",
    effortSize: "Standard",
    difficulty: "Challenging",
    deadline: null,
  },
  {
    id: "mock-4",
    title: "Organize Digital Research Notes",
    effortSize: "Quick",
    difficulty: "Comfortable",
    deadline: null,
  },
];

const effortColor: Record<string, string> = {
  Quick: "bg-accent-mint/20 text-accent-mint",
  Standard: "bg-warning-amber/20 text-warning-amber",
  "Deep Work": "bg-governor-red/20 text-governor-red",
};

const difficultyDot: Record<string, string> = {
  Comfortable: "bg-accent-mint",
  Challenging: "bg-warning-amber",
  "Very Hard": "bg-governor-red",
};

function SandboxPage() {
  const navigate = useNavigate();
  const [sandboxSleep, setSandboxSleep] = useState(7.5);
  const [sandboxEnergy, setSandboxEnergy] = useState(7);

  const schedule = useMemo(
    () => generateDailySchedule(MOCK_TASKS, 6.0, sandboxSleep, sandboxEnergy),
    [sandboxSleep, sandboxEnergy],
  );

  const burnout = useMemo(
    () =>
      calculateBurnoutTier(
        [6, 5.5, 7, 6],
        [sandboxSleep, sandboxSleep, sandboxSleep, sandboxSleep],
        sandboxEnergy,
        schedule.totalWorkMinutes,
        360,
      ),
    [sandboxSleep, sandboxEnergy, schedule.totalWorkMinutes],
  );

  const ringTier: BurnoutTier =
    burnout.tier === "red" ? "Red" : burnout.tier === "amber" ? "Amber" : "Green";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-safe mx-auto max-w-2xl px-5 pb-40 pt-8">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            CogniSync
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Your schedule, calibrated to your body
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Drag the sliders. Watch the Governor Engine rebuild your day instantly.
          </p>
        </header>

        {/* Calibration */}
        <section className="mt-8 rounded-3xl bg-surface p-6 shadow-3d-base">
          <div className="flex flex-col items-center">
            <MacroScoreRing tier={ringTier} score={burnout.score} label={burnout.label} />
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="sandbox-sleep" className="text-sm font-semibold">
                  Sleep Hours
                </label>
                <span className="text-sm font-bold text-accent-mint">
                  {sandboxSleep.toFixed(2)}h
                </span>
              </div>
              <input
                id="sandbox-sleep"
                type="range"
                min={1}
                max={12}
                step={0.25}
                value={sandboxSleep}
                onChange={(e) => setSandboxSleep(parseFloat(e.target.value))}
                className="mt-3 w-full accent-[var(--color-accent-mint)]"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="sandbox-energy" className="text-sm font-semibold">
                  Energy Level
                </label>
                <span className="text-sm font-bold text-accent-mint">
                  {sandboxEnergy}/10
                </span>
              </div>
              <input
                id="sandbox-energy"
                type="range"
                min={1}
                max={10}
                step={1}
                value={sandboxEnergy}
                onChange={(e) => setSandboxEnergy(parseInt(e.target.value, 10))}
                className="mt-3 w-full accent-[var(--color-accent-mint)]"
              />
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Today's Pacing</h2>
          <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-text-secondary">
            <span>{schedule.totalWorkMinutes}m focus</span>
            <span>·</span>
            <span>{schedule.totalRecoveryMinutes}m recovery</span>
          </div>

          <ul className="grid grid-cols-1 gap-3">
            {schedule.blocks.map((block) =>
              block.type === "recovery" ? (
                <li
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-full bg-surface/50 px-5 py-3 opacity-70 shadow-3d-pressed transition-all duration-500"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Coffee className="h-4 w-4" />
                    {block.durationMinutes}m Cognitive Recovery
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-text-secondary">
                    Mandatory Rest
                  </span>
                </li>
              ) : (
                <li
                  key={block.id}
                  className="rounded-3xl bg-surface p-4 shadow-3d-base transition-all duration-500"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${difficultyDot[block.difficulty] ?? "bg-text-secondary"}`}
                    />
                    <p className="truncate text-base font-semibold">{block.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-deep px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                      <Timer className="h-3 w-3" />
                      {block.durationMinutes}m
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${effortColor[block.effortSize] ?? "bg-slate-deep text-text-secondary"}`}
                    >
                      {block.effortSize}
                    </span>
                  </div>
                </li>
              ),
            )}
          </ul>

          <PostponedTray blocks={schedule.postponedBlocks} />
        </section>
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-surface/95 p-4 backdrop-blur">
        <button
          type="button"
          onClick={() => void navigate({ to: "/auth" })}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed"
        >
          Start Your Calibrated Schedule — Free Signup
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
