import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { signUpSchema, formatAuthError } from "@/lib/auth";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Update Password — CogniSync" },
      {
        name: "description",
        content: "Set a new password for your CogniSync account.",
      },
    ],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    const parsed = signUpSchema.safeParse({
      email: "placeholder@example.com",
      password,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Password is too weak.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password securely updated!");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-4xl bg-surface p-8 shadow-3d-base">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            Recovery
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Choose a strong password with 8+ characters, mixed case, a number,
            and a special character.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              New Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Confirm Password
            </span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none focus:ring-2 focus:ring-accent-mint/40"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
