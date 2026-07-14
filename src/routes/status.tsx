import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CalendarClock, RotateCcw, Trash2, X } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { PillGroup } from "@/components/atomic/PillGroup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type {
  DifficultyLevel,
  EffortSize,
  TaskStatus,
  TasksRow,
} from "@/types/database.types";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — CogniSync" },
      { name: "description", content: "Active workload and archived task history." },
    ],
  }),
  component: StatusPage,
});

const EFFORT_OPTIONS: readonly EffortSize[] = ["Quick", "Standard", "Deep Work"];
const DIFFICULTY_OPTIONS: readonly DifficultyLevel[] = [
  "Comfortable",
  "Challenging",
  "Very Hard",
];

const effortColor: Record<EffortSize, string> = {
  Quick: "bg-accent-mint/20 text-accent-mint",
  Standard: "bg-warning-amber/20 text-warning-amber",
  "Deep Work": "bg-governor-red/20 text-governor-red",
};

type Tab = "active" | "archived";

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;
  const [tab, setTab] = useState<Tab>("active");
  const [editing, setEditing] = useState<TasksRow | null>(null);

  const activeStatuses: TaskStatus[] =
    tab === "active" ? ["pending"] : ["completed", "rolled_back"];

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", userId, tab],
    enabled: !!userId,
    queryFn: async (): Promise<TasksRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId!)
        .in("status", activeStatuses)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TasksRow[] | null) ?? [];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "pending" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Restored to active");
      await qc.invalidateQueries({ queryKey: ["tasks", userId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Failed to restore"),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">
            Workload Command Center
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage active tasks and review archives.
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-sm gap-1 rounded-full bg-slate-deep p-1 shadow-3d-pressed">
          {(["active", "archived"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
                tab === t
                  ? "bg-accent-mint text-slate-deep shadow-3d-base"
                  : "text-text-secondary"
              }`}
            >
              {t === "active" ? "Active Workload" : "Archived History"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-24 animate-pulse rounded-3xl bg-surface/60 shadow-3d-base" />
        ) : !tasks || tasks.length === 0 ? (
          <div className="rounded-3xl bg-surface p-6 text-center shadow-3d-base">
            <p className="text-sm text-text-secondary">
              {tab === "active"
                ? "No active tasks. Head to Add Task to start."
                : "No archived history yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const dimmed = tab === "archived";
              return (
                <li
                  key={task.id}
                  className={`flex items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-3d-base ${dimmed ? "opacity-75" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => tab === "active" && setEditing(task)}
                    disabled={tab === "archived"}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-base font-semibold text-foreground">
                      {task.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${effortColor[task.effort_size]}`}
                      >
                        {task.effort_size}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                        {task.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDeadline(task.deadline)}
                      </span>
                    </div>
                  </button>
                  {tab === "archived" && (
                    <button
                      type="button"
                      onClick={() => restore.mutate(task.id)}
                      disabled={restore.isPending}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-deep px-3 py-2 text-xs font-semibold text-accent-mint transition-all active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EditTaskModal
        task={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ["tasks", userId] });
          await qc.invalidateQueries({ queryKey: ["tasks_count", userId, "pending"] });
        }}
      />
    </AppShell>
  );
}

interface EditTaskModalProps {
  task: TasksRow | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function EditTaskModal({ task, onClose, onSaved }: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [effort, setEffort] = useState<EffortSize>("Standard");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Challenging");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDeadline(task.deadline ?? "");
      setEffort(task.effort_size);
      setDifficulty(task.difficulty);
    }
  }, [task]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    setBusy(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: title.trim() || task.title,
        deadline: deadline.trim() === "" ? null : deadline,
        effort_size: effort,
        difficulty,
      } as never)
      .eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task updated");
    await onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task deleted");
    await onSaved();
    onClose();
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            key="edit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit task"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-4xl bg-surface p-6 shadow-3d-base"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Edit Task</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-deep text-text-secondary shadow-3d-base active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-text-secondary">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-text-secondary">
                  Deadline
                </span>
                <input
                  type="datetime-local"
                  value={deadline ? deadline.slice(0, 16) : ""}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
                />
              </label>
              <div>
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-text-secondary">
                  Effort Size
                </span>
                <PillGroup
                  ariaLabel="Effort size"
                  options={EFFORT_OPTIONS}
                  value={effort}
                  onChange={setEffort}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-text-secondary">
                  Difficulty
                </span>
                <PillGroup
                  ariaLabel="Difficulty"
                  options={DIFFICULTY_OPTIONS}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
                >
                  <Check className="h-5 w-5" />
                  {busy ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-governor-red/90 px-6 py-3.5 text-sm font-semibold text-white shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Task
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
