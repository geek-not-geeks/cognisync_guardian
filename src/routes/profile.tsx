import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/layouts/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CogniSync" },
      { name: "description", content: "Account, calibration preferences, and settings." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    void navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Account and calibration preferences.
          </p>
        </header>

        <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-deep shadow-3d-pressed">
              <Mail className="h-5 w-5 text-accent-mint" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-text-secondary">
                Signed in as
              </p>
              <p className="truncate text-base font-medium text-foreground">
                {user?.email ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-surface px-6 py-4 text-base font-semibold text-foreground shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </AppShell>
  );
}
