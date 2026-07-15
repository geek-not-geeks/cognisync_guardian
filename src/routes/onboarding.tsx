import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, GraduationCap, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole, UsersRow } from "@/types/database.types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — CogniSync" },
      { name: "description", content: "Set up your CogniSync profile." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [targetHours, setTargetHours] = useState(6);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  function nextStep() {
    if (!displayName.trim()) {
      toast.error("Please enter your display name.");
      return;
    }
    setStep(2);
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    const update: Partial<UsersRow> = {
      display_name: displayName.trim(),
      role,
      target_study_hours: targetHours,
    };
    const { error } = await supabase
      .from("users")
      .update(update as never)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome aboard.");
    await qc.invalidateQueries({ queryKey: ["users", user.id] });
    void navigate({ to: role === "parent" ? "/parent-view" : "/" });
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            Step {step} of 2
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {step === 1 ? "Tell us about you" : "Set your daily target"}
          </h1>
        </header>

        <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
          {step === 1 ? (
            <div className="space-y-6">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Display Name
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name"
                  className="w-full rounded-2xl bg-slate-deep px-4 py-3 text-base text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary/60 focus:ring-2 focus:ring-accent-mint/40"
                />
              </label>

              <div>
                <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Your Role
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { id: "student", label: "Student", Icon: GraduationCap },
                      { id: "parent", label: "Parent", Icon: Users },
                    ] as const
                  ).map(({ id, label, Icon }) => {
                    const active = role === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        className={`flex flex-col items-center gap-2 rounded-3xl p-5 transition-all active:scale-[0.98] ${
                          active
                            ? "bg-accent-mint text-slate-deep shadow-3d-pressed"
                            : "bg-slate-deep text-text-secondary shadow-3d-base"
                        }`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2} />
                        <span className="text-sm font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  Daily Target
                </p>
                <p className="mt-2 text-5xl font-semibold text-accent-mint">
                  {targetHours.toFixed(1)}
                  <span className="ml-1 text-base font-medium text-text-secondary">
                    hrs
                  </span>
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="w-full accent-accent-mint"
                aria-label="Daily target study hours"
              />
              <p className="text-center text-xs text-text-secondary">
                You can change this any time from Profile.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-full bg-surface px-6 py-4 text-base font-semibold text-foreground shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={step === 1 ? nextStep : handleFinish}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-mint px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : step === 1 ? (
              <>
                Continue <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <>
                Finish <Check className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
