import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { executePessimisticRollover } from "@/lib/failsafeEngine";
import type { TasksRow } from "@/types/database.types";

interface Props {
  userId: string;
}

function isEvening(): boolean {
  return new Date().getHours() >= 21;
}

export function EveningCheckInModal({ userId }: Props) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const evening = useMemo(isEvening, []);

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

  const act = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "done" | "snooze" | "drop";
    }) => {
      const patch =
        action === "done"
          ? { status: "completed" }
          : action === "drop"
            ? { status: "rolled_back" }
            : { deadline: new Date(Date.now() + 86400000).toISOString() };
      const { error } = await supabase
        .from("tasks")
        .update(patch as never)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to update task"),
  });

  const sync = useMutation({
    mutationFn: async () => executePessimisticRollover(userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Workload reconciled for tomorrow!");
      setDismissed(true);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Evening sync failed"),
  });

  const open = evening && !dismissed && (tasks?.length ?? 0) > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-deep/70 p-4 backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
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
                onClick={() => setDismissed(true)}
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
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: t.id, action: "done" })}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-mint/20 px-3 py-1.5 text-[11px] font-semibold text-accent-mint disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Mark Done
                    </button>
                    <button
                      type="button"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: t.id, action: "snooze" })}
                      className="inline-flex items-center gap-1 rounded-full bg-warning-amber/20 px-3 py-1.5 text-[11px] font-semibold text-warning-amber disabled:opacity-50"
                    >
                      <Clock className="h-3 w-3" /> Snooze +24h
                    </button>
                    <button
                      type="button"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: t.id, action: "drop" })}
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
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="mt-6 w-full rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
            >
              {sync.isPending ? "Reconciling…" : "Complete Evening Sync"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
