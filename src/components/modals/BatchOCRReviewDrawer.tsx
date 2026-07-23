import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PillGroup } from "@/components/atomic/PillGroup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { parseDefensiveDate, sanitizeTaskTitle } from "@/utils/dateParser";
import type {
  Difficulty,
  EffortSize,
  ParsedTaskPayload,
} from "@/types/task";

interface BatchOCRReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirmed?: () => void;
  initialTasks: ParsedTaskPayload[];
  warningMessage?: string | null;
}

const EFFORT_OPTIONS: readonly EffortSize[] = ["Quick", "Standard", "Deep Work"];
const DIFFICULTY_OPTIONS: readonly Difficulty[] = [
  "Comfortable",
  "Challenging",
  "Very Hard",
];

export function BatchOCRReviewDrawer({
  open,
  onClose,
  onConfirmed,
  initialTasks,
}: BatchOCRReviewDrawerProps) {
  const [tasks, setTasks] = useState<ParsedTaskPayload[]>(initialTasks);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setTasks(initialTasks);
  }, [open, initialTasks]);

  function updateTask(index: number, patch: Partial<ParsedTaskPayload>) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmAll() {
    if (!user) {
      toast.error("You must be signed in to save tasks.");
      return;
    }
    if (tasks.length === 0) return;

    setSaving(true);
    const preparedTasks = tasks.map((t) => {
      const parsedDeadline = parseDefensiveDate(t.deadline || "");
      const defaultDeadline = new Date(Date.now() + 86_400_000).toISOString();
      return {
        user_id: user.id,
        title: sanitizeTaskTitle(t.title || "Untitled Task"),
        raw_text: t.rawText ?? null,
        deadline: parsedDeadline.isoString || defaultDeadline,
        effort_size: t.effortSize || "Standard",
        difficulty: t.difficulty || "Challenging",
        status: "pending" as const,
        is_governor_locked: false,
      };
    });

    try {
      const { error } = await supabase
        .from("tasks")
        .insert(preparedTasks as never);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Tasks securely synchronized to your schedule!");
      void queryClient.invalidateQueries({ queryKey: ["tasks_count"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onConfirmed?.();
      onClose();
    } catch (e) {
      toast.error(
        `Network issue — ${e instanceof Error ? e.message : "unknown"}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60"
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Review parsed tasks"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-4xl bg-surface shadow-3d-base"
          >
            <div
              className="flex h-full flex-col px-6 pt-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
            >
              <div className="flex justify-center pb-3">
                <span className="h-1.5 w-12 rounded-full bg-slate-700" />
              </div>

              <header className="pb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Review Parsed Tasks
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Edit or remove any task before syncing.
                </p>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {tasks.length === 0 && (
                  <p className="rounded-2xl bg-slate-deep p-6 text-center text-sm text-text-secondary shadow-3d-pressed">
                    No tasks to sync. Close and try again.
                  </p>
                )}

                {tasks.map((task, i) => (
                  <TaskCard
                    key={i}
                    index={i}
                    task={task}
                    onChange={(patch) => updateTask(i, patch)}
                    onRemove={() => removeTask(i)}
                  />
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  disabled={saving || tasks.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  )}
                  {saving
                    ? "Syncing…"
                    : `Confirm & Sync All (${tasks.length} Task${tasks.length === 1 ? "" : "s"})`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface TaskCardProps {
  index: number;
  task: ParsedTaskPayload;
  onChange: (patch: Partial<ParsedTaskPayload>) => void;
  onRemove: () => void;
}

function TaskCard({ index, task, onChange, onRemove }: TaskCardProps) {
  const [deadlineText, setDeadlineText] = useState(task.deadline ?? "");

  useEffect(() => {
    setDeadlineText(task.deadline ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolved = useMemo(
    () => parseDefensiveDate(deadlineText),
    [deadlineText],
  );

  return (
    <div className="space-y-4 rounded-3xl bg-slate-deep p-5 shadow-3d-pressed">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Task {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove task ${index + 1}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-governor-red shadow-3d-base active:scale-95 active:shadow-3d-pressed"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Field label="Title">
        <input
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-2xl bg-surface px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
        />
      </Field>

      <Field label="Deadline">
        <input
          value={deadlineText}
          onChange={(e) => {
            setDeadlineText(e.target.value);
            onChange({ deadline: e.target.value });
          }}
          placeholder="e.g., Tomorrow 5pm, Next Weds at 2"
          className="w-full rounded-2xl bg-surface px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
        />
        {resolved.hasConflict ? (
          <div className="mt-2 space-y-2 rounded-2xl bg-amber-500/10 p-3 shadow-3d-pressed">
            <p className="text-xs font-semibold text-amber-400">
              ⚠️ Contradictory dates detected. Tap to select correct deadline:
            </p>
            <div className="flex flex-wrap gap-2">
              {resolved.conflictOptions?.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDeadlineText(opt.label);
                    onChange({ deadline: opt.label });
                  }}
                  className="rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-3d-base active:scale-95"
                >
                  Use {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : resolved.formattedLabel ? (
          <span className="mt-2 inline-flex items-center rounded-full bg-accent-mint/15 px-3 py-1 text-xs font-semibold text-accent-mint">
            {resolved.formattedLabel}
          </span>
        ) : deadlineText.trim() ? (
          <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
            ⚠️ Unrecognized format. Defaulting to 24h from now.
          </span>
        ) : null}
      </Field>

      <Field label="Effort Size">
        <PillGroup
          ariaLabel="Effort size"
          options={EFFORT_OPTIONS}
          value={task.effortSize}
          onChange={(v) => onChange({ effortSize: v })}
        />
      </Field>

      <Field label="Difficulty">
        <PillGroup
          ariaLabel="Difficulty"
          options={DIFFICULTY_OPTIONS}
          value={task.difficulty}
          onChange={(v) => onChange({ difficulty: v })}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
