import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { CompletionRatingModal } from "@/components/modals/CompletionRatingModal";
import type { EffortSize, DifficultyLevel, TasksRow } from "@/types/database.types";

interface Props {
  userId: string;
}

const effortColor: Record<EffortSize, string> = {
  Quick: "bg-accent-mint/20 text-accent-mint",
  Standard: "bg-warning-amber/20 text-warning-amber",
  "Deep Work": "bg-governor-red/20 text-governor-red",
};

const difficultyDot: Record<DifficultyLevel, string> = {
  Comfortable: "bg-accent-mint shadow-[0_0_8px_var(--color-accent-mint)]",
  Challenging: "bg-warning-amber shadow-[0_0_8px_var(--color-warning-amber)]",
  "Very Hard": "bg-governor-red shadow-[0_0_10px_var(--color-governor-red)]",
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "No deadline";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Whether a still-pending task's deadline has already passed.
 *
 * This is computed client-side rather than persisted as a "missed" DB
 * status. The TaskStatus type includes "missed" as a value, but nothing
 * writes it — there is no scheduled job flipping status when a deadline
 * lapses. Doing that properly needs a server-side cron (a Supabase Edge
 * Function on a schedule) to be the source of truth, since client-side
 * computation alone can't reliably update rows nobody has open. That's
 * deliberately out of scope for now; this is the fast, honest interim fix
 * so overdue tasks are at least visible, not silently identical to
 * upcoming ones.
 */
function isOverdue(task: TasksRow): boolean {
  if (task.status !== "pending" || !task.deadline) return false;
  const d = new Date(task.deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function TaskPipeline({ userId }: Props) {
  const qc = useQueryClient();
  const [ratingTask, setRatingTask] = useState<TasksRow | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", userId, "pending"],
    queryFn: async (): Promise<TasksRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data as TasksRow[] | null) ?? [];
      // Supabase already sorts by deadline ascending; additionally float
      // overdue tasks to the very top so they can't be missed by scrolling.
      return [...rows].sort((a, b) => {
        const aOverdue = isOverdue(a);
        const bOverdue = isOverdue(b);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return 0;
      });
    },
  });

  const complete = useMutation({
    mutationFn: async (params: {
      id: string;
      selfReportedSuccess: number;
      actualEffortMinutes: number | null;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          self_reported_success: params.selfReportedSuccess,
          actual_effort_minutes: params.actualEffortMinutes,
        } as never)
        .eq("id", params.id);
      if (error) throw error;
      return params.id;
    },
    onSuccess: async () => {
      toast.success("Task completed");
      setRatingTask(null);
      await qc.invalidateQueries({ queryKey: ["tasks", userId] });
      await qc.invalidateQueries({ queryKey: ["tasks_count", userId, "pending"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    },
  });

  if (isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-3xl bg-surface/60 shadow-3d-base" />
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center shadow-3d-base">
        <p className="text-sm text-text-secondary">
          No active tasks scheduled. Tap{" "}
          <span className="font-semibold text-accent-mint">Add Task</span> below
          to initialize your workload.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {tasks.map((task) => {
          const overdue = isOverdue(task);
          return (
          <li
            key={task.id}
            className={`mb-3 flex items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-3d-base ${
              overdue ? "border-l-4 border-governor-red" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${difficultyDot[task.difficulty]}`}
                  aria-label={`Difficulty ${task.difficulty}`}
                />
                <p className="truncate text-base font-semibold text-foreground">
                  {task.title}
                </p>
                {overdue && (
                  <span className="inline-flex shrink-0 rounded-full bg-governor-red/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-governor-red">
                    Overdue
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${effortColor[task.effort_size]}`}
                >
                  {task.effort_size}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    overdue ? "font-semibold text-governor-red" : "text-text-secondary"
                  }`}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDeadline(task.deadline)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRatingTask(task)}
              disabled={complete.isPending}
              aria-label={`Mark ${task.title} complete`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-deep text-text-secondary transition-all hover:text-accent-mint hover:border-accent-mint active:scale-95 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
            </button>
          </li>
          );
        })}
      </ul>

      <CompletionRatingModal
        open={ratingTask !== null}
        taskTitle={ratingTask?.title ?? ""}
        onClose={() => setRatingTask(null)}
        onSubmit={async ({ selfReportedSuccess, actualEffortMinutes }) => {
          if (!ratingTask) return;
          await complete.mutateAsync({
            id: ratingTask.id,
            selfReportedSuccess,
            actualEffortMinutes,
          });
        }}
      />
    </>
  );
}
