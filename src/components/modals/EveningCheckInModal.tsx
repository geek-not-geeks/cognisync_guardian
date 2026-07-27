import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { executePessimisticRollover } from "@/lib/failsafeEngine";
import type { TasksRow } from "@/types/database.types";

interface Props {
  userId: string;
}

const SYNC_KEY = "last_evening_sync_date";
const UNDO_DURATION = 6000;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isEvening(): boolean {
  return new Date().getHours() >= 21;
}

function alreadySeenToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SYNC_KEY) === todayStr();
  } catch {
    return false;
  }
}

export function EveningCheckInModal({ userId }: Props) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(() => alreadySeenToday());
  const [busy, setBusy] = useState(false);
  const evening = useMemo(isEvening, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(SYNC_KEY, todayStr());
    } catch {
      /* storage unavailable — session-only dismissal */
    }
    setDismissed(true);
  };
  const closeForToday = handleDismiss;

  const { data: tasks } = useQuery({
    queryKey: ["tasks", userId, "evening"],
    enabled: evening && !dismissed,
    queryFn: async (): Promise<TasksRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending");
      if (error) throw error;
      return (data as TasksRow[] | null) ?? [];
    },
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const patchTask = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from("tasks")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    await refresh();
  };

  const withGuard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = (task: TasksRow) =>
    withGuard(async () => {
      const oldDeadline = task.deadline;
      const tomorrowISO = new Date(Date.now() + 86400000).toISOString();
      await patchTask(task.id, { deadline: tomorrowISO });

      toast("Task snoozed +24 hours", {
        duration: UNDO_DURATION,
        description: `Moved "${task.title}" to tomorrow.`,
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              await patchTask(task.id, { deadline: oldDeadline });
              toast.success("Snooze reverted!");
            })();
          },
        },
      });
    });

  const handleDone = (task: TasksRow) =>
    withGuard(async () => {
      const oldStatus = task.status;
      await patchTask(task.id, { status: "completed" });

      toast("Task marked complete", {
        duration: UNDO_DURATION,
        description: `"${task.title}" archived for today.`,
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              await patchTask(task.id, { status: oldStatus ?? "pending" });
              toast.success("Completion reverted!");
            })();
          },
        },
      });
    });

  const handleDrop = (task: TasksRow) =>
    withGuard(async () => {
      await patchTask(task.id, { status: "rolled_back" });

      toast("Task dropped", {
        duration: UNDO_DURATION,
        description: `"${task.title}" rolled back out of today.`,
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              await patchTask(task.id, { status: "pending" });
              toast.success("Task restored to active!");
            })();
          },
        },
      });
    });

  const handleSync = () =>
    withGuard(async () => {
      await executePessimisticRollover(userId);
      await refresh();
      toast.success("Workload reconciled for tomorrow!");
      closeForToday();
    });

  const open = evening && !dismissed && (tasks?.length ?? 0) > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          onClick={closeForToday}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-deep/70 p-4 backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-md rounded-4xl bg-surface p-6 pb-safe shadow-3d-base"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Evening Synchronization
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Reconcile today's remaining workload before bed.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss evening sync"
                onClick={closeForToday}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-deep text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-5 max-h-[45vh] space-y-3 overflow-y-auto">
              {(tasks ?? []).map((t) => (
                <li key={t.id} className="rounded-3xl bg-slate-deep/60 p-4">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {t.title}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDone(t)}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-mint/20 px-3 py-1.5 text-[11px] font-semibold text-accent-mint disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Mark Done
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSnooze(t)}
                      className="inline-flex items-center gap-1 rounded-full bg-warning-amber/20 px-3 py-1.5 text-[11px] font-semibold text-warning-amber disabled:opacity-50"
                    >
                      <Clock className="h-3 w-3" /> Snooze +24h
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDrop(t)}
                      className="inline-flex items-center gap-1 rounded-full bg-governor-red/20 px-3 py-1.5 text-[11px] font-semibold text-governor-red disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Drop
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={busy}
              className="mt-6 w-full rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
            >
              {busy ? "Reconciling…" : "Complete Evening Sync"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
