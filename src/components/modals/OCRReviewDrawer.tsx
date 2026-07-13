import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, RefreshCw } from "lucide-react";

export type EffortSize = "Quick" | "Standard" | "Deep Work";
export type Difficulty = "Comfortable" | "Challenging" | "Very Hard";

export interface ParsedTask {
  title: string;
  deadline: string;
  effort: EffortSize;
  difficulty: Difficulty;
}

interface OCRReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (task: ParsedTask) => void;
  onRetake?: () => void;
  initial?: Partial<ParsedTask>;
}

const EFFORT_OPTIONS: EffortSize[] = ["Quick", "Standard", "Deep Work"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["Comfortable", "Challenging", "Very Hard"];

const DEFAULT_TASK: ParsedTask = {
  title: "Chemistry Lab Report",
  deadline: "Tomorrow",
  effort: "Standard",
  difficulty: "Challenging",
};

export function OCRReviewDrawer({
  open,
  onClose,
  onConfirm,
  onRetake,
  initial,
}: OCRReviewDrawerProps) {
  const [task, setTask] = useState<ParsedTask>({ ...DEFAULT_TASK, ...initial });

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
            className="fixed inset-x-0 bottom-0 z-50 h-[60vh] rounded-t-[32px] bg-[#1E293B] shadow-3d-base"
            style={{
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.08), 0 -12px 40px rgba(0,0,0,0.5)",
            }}
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
                    className="w-full rounded-2xl bg-[#0F172A] px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-accent-mint/40"
                  />
                </Field>

                <Field label="Deadline">
                  <input
                    value={task.deadline}
                    onChange={(e) => setTask({ ...task, deadline: e.target.value })}
                    className="w-full rounded-2xl bg-[#0F172A] px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-accent-mint/40"
                  />
                </Field>

                <Field label="Effort Size">
                  <PillGroup
                    options={EFFORT_OPTIONS}
                    value={task.effort}
                    onChange={(v) => setTask({ ...task, effort: v })}
                  />
                </Field>

                <Field label="Difficulty">
                  <PillGroup
                    options={DIFFICULTY_OPTIONS}
                    value={task.difficulty}
                    onChange={(v) => setTask({ ...task, difficulty: v })}
                  />
                </Field>
              </div>

              <div className="flex flex-col items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onConfirm?.(task)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-[#0F172A] shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed"
                >
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                  Confirm & Sync
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

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
              active
                ? "bg-accent-mint text-[#0F172A] shadow-3d-pressed"
                : "bg-[#1E293B] text-text-secondary shadow-3d-base hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
