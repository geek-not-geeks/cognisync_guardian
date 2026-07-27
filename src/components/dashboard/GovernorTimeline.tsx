import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Coffee, Timer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { generateDailySchedule } from "@/lib/governorEngine";
import type { EffortSize, DifficultyLevel, TasksRow } from "@/types/database.types";

interface Props {
  userId: string;
  targetHours: number | null | undefined;
  sleepHours: number | null | undefined;
  energyLevel: number | null | undefined;
}

const effortColor: Record<string, string> = {
  Quick: "bg-accent-mint/20 text-accent-mint",
  Standard: "bg-warning-amber/20 text-warning-amber",
  "Deep Work": "bg-governor-red/20 text-governor-red",
};

const difficultyDot: Record<string, string> = {
  Comfortable: "bg-accent-mint shadow-[0_0_8px_var(--color-accent-mint)]",
  Challenging: "bg-warning-amber shadow-[0_0_8px_var(--color-warning-amber)]",
  "Very Hard": "bg-governor-red shadow-[0_0_10px_var(--color-governor-red)]",
};

export function GovernorTimeline({
  userId,
  targetHours,
  sleepHours,
  energyLevel,
}: Props) {
  const qc = useQueryClient();
  const shiftedRef = useRef<string>("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", userId, "timeline"],
    queryFn: async (): Promise<TasksRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending", "completed"])
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TasksRow[] | null) ?? [];
    },
  });

  const statusById = useMemo(
    () => new Map((tasks ?? []).map((t) => [t.id, t.status])),
    [tasks],
  );

  const schedule = useMemo(
    () =>
      generateDailySchedule(
        (tasks ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          effortSize: t.effort_size,
          difficulty: t.difficulty,
          deadline: t.deadline,
        })),
        targetHours ?? 6,
        sleepHours ?? 7,
        energyLevel ?? 5,
      ),
    [tasks, targetHours, sleepHours, energyLevel],
  );

  // Live pacing math: only count blocks whose underlying task is not completed.
  const { activeWorkMinutes, activeRecoveryMinutes } = useMemo(() => {
    let work = 0;
    let recovery = 0;
    let lastWorkCompleted = false;
    for (const block of schedule.blocks) {
      if (block.type === "work") {
        lastWorkCompleted = statusById.get(block.taskId) === "completed";
        if (!lastWorkCompleted) work += block.durationMinutes;
      } else if (!lastWorkCompleted) {
        recovery += block.durationMinutes;
      }
    }
    return { activeWorkMinutes: work, activeRecoveryMinutes: recovery };
  }, [schedule, statusById]);

  const completedBlocks = useMemo(
    () =>
      schedule.blocks.filter(
        (b) => b.type === "work" && statusById.get(b.taskId) === "completed",
      ),
    [schedule, statusById],
  );

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" } as never)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async () => {
      toast.success("Task completed");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["tasks_count", userId, "pending"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    },
  });


  // Background deadline shift for governor-overridden tasks (+24h)
  const overriddenKey = schedule.overriddenTaskIds.join(",");
  useEffect(() => {
    if (!overriddenKey || shiftedRef.current === overriddenKey) return;
    shiftedRef.current = overriddenKey;
    const ids = overriddenKey.split(",");
    const byId = new Map((tasks ?? []).map((t) => [t.id, t]));

    void (async () => {
      for (const id of ids) {
        const task = byId.get(id);
        if (!task) continue;
        const base = task.deadline ? new Date(task.deadline) : new Date();
        if (Number.isNaN(base.getTime())) continue;
        const shifted = new Date(base.getTime() + 24 * 60 * 60 * 1000);
        await supabase
          .from("tasks")
          .update({ deadline: shifted.toISOString() } as never)
          .eq("id", id)
          .eq("user_id", userId);
      }
      await qc.invalidateQueries({ queryKey: ["tasks", userId] });
    })();
  }, [overriddenKey, tasks, userId, qc]);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-3xl bg-surface/60 shadow-3d-base" />;
  }

  if (schedule.blocks.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center shadow-3d-base">
        <p className="text-sm text-text-secondary">
          No blocks scheduled. Tap{" "}
          <span className="font-semibold text-accent-mint">Add Task</span> below to
          initialize your workload.
        </p>
      </div>
    );
  }

  return (
    <div>
      {schedule.statusMessage && (
        <div className="mb-3 flex items-start gap-3 rounded-3xl border border-warning-amber/40 bg-warning-amber/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-amber" />
          <p className="text-xs font-medium text-warning-amber">
            {schedule.statusMessage}
          </p>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-text-secondary">
        <span>{activeWorkMinutes}m focus</span>
        <span>·</span>
        <span>{activeRecoveryMinutes}m recovery</span>
      </div>

      <ul>
        {schedule.blocks
          .filter((b) => statusById.get(b.taskId) !== "completed")
          .map((block) => {
          return block.type === "recovery" ? (
            <li
              key={block.id}
              className="mb-3 flex items-center justify-between gap-3 rounded-full bg-surface/50 px-5 py-3 opacity-70 shadow-3d-pressed"
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
              className="mb-3 flex items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-3d-base transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${difficultyDot[block.difficulty as DifficultyLevel] ?? "bg-text-secondary"}`}
                    aria-label={`Difficulty ${block.difficulty}`}
                  />
                  <p className="truncate text-base font-semibold text-foreground">
                    {block.title}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-deep px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                    <Timer className="h-3 w-3" />
                    {block.durationMinutes}m
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${effortColor[block.effortSize as EffortSize] ?? "bg-slate-deep text-text-secondary"}`}
                  >
                    {block.effortSize}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => complete.mutate(block.taskId)}
                disabled={complete.isPending}
                aria-label={`Mark ${block.title} complete`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-deep text-text-secondary transition-all hover:border-accent-mint hover:text-accent-mint active:scale-95 disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
              </button>
            </li>
          );
        })}
      </ul>

      {completedBlocks.length > 0 && (
        <details className="mt-6 rounded-3xl border border-slate-800 bg-slate-deep/40 p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Completed Today ({completedBlocks.length})
          </summary>
          <ul className="mt-4">
            {completedBlocks.map((block) => (
              <li
                key={block.id}
                className="mb-3 flex items-center justify-between gap-3 rounded-3xl border border-dashed border-slate-800 p-4 opacity-40"
              >
                <p className="truncate text-sm font-semibold text-foreground line-through">
                  {block.title}
                </p>
                <Check className="h-5 w-5 shrink-0 text-accent-mint" />
              </li>
            ))}
          </ul>
        </details>
      )}


    </div>
  );
}
