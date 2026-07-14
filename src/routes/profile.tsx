import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, User as UserIcon, Clock } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/layouts/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { UsersRow } from "@/types/database.types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CogniSync" },
      { name: "description", content: "Account, calibration preferences, and settings." },
    ],
  }),
  component: ProfilePage,
});

type ProfileSlice = Pick<UsersRow, "display_name" | "target_study_hours">;

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["users", userId, "profile-edit"],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileSlice | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("display_name, target_study_hours")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileSlice | null) ?? null;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setTargetHours(
        profile.target_study_hours != null ? String(profile.target_study_hours) : "",
      );
    }
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = displayName.trim();
    const hoursNum = targetHours === "" ? null : Number(targetHours);
    if (hoursNum !== null && (Number.isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24)) {
      toast.error("Study hours must be between 0 and 24");
      return;
    }
    setSaving(true);
    const update: Partial<UsersRow> = {
      display_name: trimmed === "" ? null : trimmed,
      target_study_hours: hoursNum,
    };
    const { error } = await supabase
      .from("users")
      .update(update as never)
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Preferences saved");
    await qc.invalidateQueries({ queryKey: ["users", userId] });
  }

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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
                <UserIcon className="h-4 w-4" />
                Display Name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder="Preetish Priyadarshi"
                disabled={isLoading}
                className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary/60 focus:ring-2 focus:ring-accent-mint"
              />
            </label>
          </div>

          <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
                <Clock className="h-4 w-4" />
                Daily Target Study Hours
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={24}
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                placeholder="6"
                disabled={isLoading}
                className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary/60 focus:ring-2 focus:ring-accent-mint"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || isLoading}
            className="w-full rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </form>

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
