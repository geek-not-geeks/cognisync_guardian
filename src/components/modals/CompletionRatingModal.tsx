import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { PillGroup } from "@/components/atomic/PillGroup";

interface CompletionRatingModalProps {
  open: boolean;
  taskTitle: string;
  onClose: () => void;
  onSubmit: (result: { selfReportedSuccess: number; actualEffortMinutes: number | null }) => Promise<void> | void;
}

const SUCCESS_OPTIONS = ["1", "2", "3", "4", "5"] as const;
const DEFAULT_SUCCESS = "3";

/**
 * Captured at task completion, alongside the confidence rating captured at
 * creation. Together these two data points are what src/lib/predictiveAnalytics.ts
 * actually analyzes - without this modal, "completed" only ever tells you a
 * task was closed, never whether it went well or how much it actually cost.
 */
export function CompletionRatingModal({
  open,
  taskTitle,
  onClose,
  onSubmit,
}: CompletionRatingModalProps) {
  const [success, setSuccess] = useState<string>(DEFAULT_SUCCESS);
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit({
        selfReportedSuccess: Number(success),
        actualEffortMinutes: minutes.trim() ? Number(minutes) : null,
      });
      setSuccess(DEFAULT_SUCCESS);
      setMinutes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="completion-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={saving ? undefined : onClose}
            className="fixed inset-0 z-40 bg-black/60"
            aria-hidden="true"
          />
          <motion.div
            key="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Rate task completion"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-4xl bg-surface p-6 shadow-3d-base"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <div className="mb-4 flex justify-center">
              <span className="h-1.5 w-12 rounded-full bg-slate-700" />
            </div>

            <h2 className="text-lg font-semibold text-foreground">Nice work.</h2>
            <p className="mt-1 truncate text-sm text-text-secondary">{taskTitle}</p>

            <div className="mt-5">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                How well did it actually go?
              </span>
              <PillGroup
                ariaLabel="Self-reported success"
                options={SUCCESS_OPTIONS}
                value={success}
                onChange={setSuccess}
              />
              <p className="mt-2 text-[11px] text-text-secondary">
                1 = rushed / poor · 5 = genuinely went well
              </p>
            </div>

            <div className="mt-5">
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  Minutes actually spent (optional)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base font-medium text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
              ) : (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              )}
              {saving ? "Saving…" : "Confirm Completion"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
