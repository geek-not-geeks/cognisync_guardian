import { useState, type FormEvent } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { signUpSchema, formatAuthError } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export function SecuritySettingsCard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      toast.error("No authenticated session detected.");
      return;
    }
    if (next !== confirm) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    const parsed = signUpSchema.shape.password.safeParse(next);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Password too weak.");
      return;
    }

    setBusy(true);
    try {
      // Step A: Re-authenticate with current password.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (signInError) {
        throw new Error("Current password is incorrect. Authorization denied.");
      }

      // Step B: Commit new password hash.
      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) throw updateError;

      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password securely updated! Your session remains active.");
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-4xl bg-surface p-6 shadow-3d-base">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-deep shadow-3d-pressed">
          <ShieldCheck className="h-5 w-5 text-accent-mint" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Security & Credentials
          </h2>
          <p className="text-xs text-text-secondary">
            Change your password with re-authentication.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          label="Current Password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}
          {busy ? "Updating…" : "Update Password"}
        </button>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <input
        type="password"
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
      />
    </label>
  );
}
