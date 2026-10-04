import { useQuery } from "@tanstack/react-query";
import { BrainCircuit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  computePersonalizationInsight,
  MIN_SAMPLE_SIZE,
} from "@/lib/personalizationEngine";
import type { Observation } from "@/lib/predictiveAnalytics";
import type { TasksRow } from "@/types/database.types";

interface Props {
  userId: string;
}

/**
 * This is what actually answers "is this app learning from my confidence
 * and completion yet, or is it just the same static formula every day."
 * Shown honestly: cold-start until MIN_SAMPLE_SIZE real observations exist,
 * and even once active, the interpretation text stays conservative at small
 * sample sizes — this panel will not claim a pattern it can't support.
 */
export function PersonalizationPanel({ userId }: Props) {
  const { data: observations, isLoading } = useQuery({
    queryKey: ["personalization-observations", userId],
    queryFn: async (): Promise<Observation[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .not("confidence_rating", "is", null)
        .or("status.eq.completed,status.eq.rolled_back");
      if (error) throw error;

      const rows = (data as TasksRow[] | null) ?? [];
      return rows
        .filter((t) => t.confidence_rating != null)
        .map((t) => ({
          confidence: t.confidence_rating as number,
          completed: t.status === "completed",
        }));
    },
  });

  if (isLoading) {
    return <div className="h-20 animate-pulse rounded-3xl bg-surface/60 shadow-3d-base" />;
  }

  const insight = computePersonalizationInsight(observations ?? []);

  return (
    <div className="mb-4 rounded-3xl bg-surface p-5 shadow-3d-base">
      <div className="mb-2 flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-accent-mint" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
          Personalization
        </p>
      </div>

      {insight.status === "cold-start" ? (
        <>
          <p className="text-sm font-medium text-foreground">
            Baseline mode — {insight.observationsLogged} of{" "}
            {insight.observationsNeeded} logged tasks
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            CogniSync is using the general burnout heuristic for everyone until
            you've logged {insight.observationsNeeded} tasks with a confidence
            rating. After that, it starts checking whether your own confidence
            actually predicts whether you finish — not before.
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-deep">
            <div
              className="h-full rounded-full bg-accent-mint transition-all"
              style={{
                width: `${Math.min(100, (insight.observationsLogged / insight.observationsNeeded) * 100)}%`,
              }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            Personalized model active — n={insight.observationsLogged}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{insight.interpretation}</p>
          <p className="mt-1 text-[11px] text-text-secondary">
            In-sample fit accuracy: {(insight.trainAccuracy * 100).toFixed(0)}%
            (p={insight.pValue.toFixed(3)}). More logged tasks will keep
            refining this.
          </p>
        </>
      )}
    </div>
  );
}
