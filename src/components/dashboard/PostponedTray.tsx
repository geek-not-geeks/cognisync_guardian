import { Lock } from "lucide-react";
import type { ScheduledBlock } from "@/lib/governorEngine";

interface Props {
  blocks: ScheduledBlock[];
}

export function PostponedTray({ blocks }: Props) {
  if (blocks.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl bg-surface p-5 shadow-3d-base">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lock className="h-4 w-4 text-warning-amber" />
        🔒 Postponed for Cognitive Recovery
      </h3>
      <ul className="mt-4 space-y-3">
        {blocks.map((block) => (
          <li
            key={block.id}
            className="rounded-3xl border border-warning-amber/20 bg-warning-amber/5 p-4 opacity-60 transition-all duration-500"
          >
            <p className="truncate text-sm font-semibold text-foreground">
              {block.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-warning-amber/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-amber">
                {block.difficulty}
              </span>
              <span className="inline-flex rounded-full bg-warning-amber/10 px-2.5 py-0.5 text-[10px] font-medium text-warning-amber">
                {block.reason ?? "Postponed by Biometric Guardrail."}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
