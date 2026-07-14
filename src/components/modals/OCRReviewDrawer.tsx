import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PillGroup } from "@/components/atomic/PillGroup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { enqueue } from "@/lib/offlineQueue";
import type {
  Difficulty,
  EffortSize,
  ParsedTaskPayload,
} from "@/types/task";

interface OCRReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (task: ParsedTaskPayload) => void;
  onRetake?: () => void;
  initialData?: ParsedTaskPayload;
}

const EFFORT_OPTIONS: readonly EffortSize[] = ["Quick", "Standard", "Deep Work"];
const DIFFICULTY_OPTIONS: readonly Difficulty[] = [
  "Comfortable",
  "Challenging",
  "Very Hard",
];

const DEFAULT_TASK: ParsedTaskPayload = {
  title: "Chemistry Lab Report",
  deadline: "Tomorrow",
  effortSize: "Standard",
  difficulty: "Challenging",
};

export function OCRReviewDrawer({
  open,
  onClose,
  onConfirm,
  onRetake,
  initialData,
}: OCRReviewDrawerProps) {
  const [task, setTask] = useState<ParsedTaskPayload>({
    ...DEFAULT_TASK,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  async function handleConfirm() {
    if (!user) {
      toast.error("You must be signed in to save tasks.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: task.title,
      raw_text: task.rawText ?? null,
      effort_size: task.effortSize,
      difficulty: task.difficulty,
      deadline: task.deadline ?? null,
      status: "pending" as const,
      is_governor_locked: false,
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueue({ kind: "task_insert", payload });
        toast.success("Saved offline — will sync when back online.");
      } else {
        const { error } = await supabase.from("tasks").insert(payload as never);
        if (error) {
          await enqueue({ kind: "task_insert", payload });
          toast.error(`Queued: ${error.message}`);
        } else {
          toast.success("Task synced");
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["tasks_count"] });
      onConfirm?.(task);
    } catch (e) {
      // Malformed response / network JSON parse failure: keep the change,
      // never crash the shell.
      await enqueue({ kind: "task_insert", payload });
      toast.error(
        `Network issue — queued for retry (${e instanceof Error ? e.message : "unknown"}).`,
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
            aria-label="Review parsed task"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 h-[60vh] rounded-t-4xl bg-surface shadow-3d-base"
          >
            <div
              className="flex h-full flex-col px-6 pt-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pb-3">
                <span className="h-1.5 w-12 rounded-full bg-slate-700" />
              </div>

              <header className="pb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Review Parsed Task
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Confirm the details before syncing to your schedule.
                </p>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                <Field label="Title">
                  <input
                    value={task.title}
                    onChange={(e) => setTask({ ...task, title: e.target.value })}
                    className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-accent-mint/40"
                  />
                </Field>

                <Field label="Deadline">
                  <input
                    value={task.deadline ?? ""}
                    onChange={(e) => setTask({ ...task, deadline: e.target.value })}
                    className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-accent-mint/40"
                  />
                </Field>

                <Field label="Effort Size">
                  <PillGroup
                    ariaLabel="Effort size"
                    options={EFFORT_OPTIONS}
                    value={task.effortSize}
                    onChange={(v) => setTask({ ...task, effortSize: v })}
                  />
                </Field>

                <Field label="Difficulty">
                  <PillGroup
                    ariaLabel="Difficulty"
                    options={DIFFICULTY_OPTIONS}
                    value={task.difficulty}
                    onChange={(v) => setTask({ ...task, difficulty: v })}
                  />
                </Field>
              </div>

              <div className="flex flex-col items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  )}
                  {saving ? "Syncing…" : "Confirm & Sync"}
                </button>
                <button
                  type="button"
                  onClick={onRetake ?? onClose}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retake
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
