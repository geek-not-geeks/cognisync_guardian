import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatAuthError } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, defaultEmail }: Props) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setEmail(defaultEmail ?? "");
  }, [open, defaultEmail]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast.success("Recovery link sent! Please check your email.");
      onClose();
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-4xl bg-surface p-6 shadow-3d-base"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
              Recovery
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Forgot Password
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-slate-deep p-2 text-text-secondary shadow-3d-pressed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-5 text-sm text-text-secondary">
          Enter the email tied to your account. We'll send you a secure link to
          reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            Send Recovery Link
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
