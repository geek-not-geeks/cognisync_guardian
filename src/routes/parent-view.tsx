import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/layouts/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { BurnoutPreventionHero } from "@/components/parent/BurnoutPreventionHero";
import { BiometricTrend } from "@/components/parent/BiometricTrend";
import { SystemStatePill } from "@/components/parent/SystemStatePill";
import type { DailyCalibrationsRow } from "@/types/database.types";

export const Route = createFileRoute("/parent-view")({
  head: () => ({
    meta: [
      { title: "Parent View — CogniSync" },
      {
        name: "description",
        content:
          "Read-only macro burnout and biometric indexes for your linked student.",
      },
    ],
  }),
  component: ParentViewPage,
});

function ParentViewPage() {
  return (
    <AppShell>
      <ParentDashboard />
    </AppShell>
  );
}

function ParentDashboard() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const parentId = user?.id ?? null;

  const { data: studentId, isLoading: studentLoading } = useQuery({
    queryKey: ["linked_student", parentId],
    enabled: !!parentId && role === "parent",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("parent_id", parentId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string } | null)?.id ?? null;
    },
  });

  const { data: rows, isLoading: calLoading } = useQuery({
    queryKey: ["parent_calibrations_7d", studentId],
    enabled: !!studentId,
    queryFn: async (): Promise<DailyCalibrationsRow[]> => {
      const { data, error } = await supabase
        .from("daily_calibrations")
        .select("*")
        .eq("user_id", studentId!)
        .order("date", { ascending: false })
        .limit(7);
      if (error) throw error;
      return (data as DailyCalibrationsRow[] | null) ?? [];
    },
  });

  if (roleLoading) {
    return <p className="p-6 text-sm text-text-secondary">Loading…</p>;
  }

  if (role !== "parent") {
    return (
      <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
        <p className="text-sm text-text-secondary">
          Parent view is available to accounts with the parent role.
        </p>
      </div>
    );
  }

  const currentTier = rows?.[0]?.burnout_tier ?? null;
  const list = rows ?? [];

  return (
    <div className="space-y-6 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
            CogniSync
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Parent View
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Macro indexes only — no individual assignments.
          </p>
        </div>
        <SystemStatePill tier={currentTier} />
      </header>

      {studentLoading || calLoading ? (
        <div className="h-40 animate-pulse rounded-4xl bg-surface shadow-3d-base" />
      ) : !studentId ? (
        <div className="rounded-4xl bg-surface p-6 shadow-3d-base">
          <p className="text-sm text-text-secondary">
            No linked student found on your account.
          </p>
        </div>
      ) : (
        <>
          <BurnoutPreventionHero rows={list} />
          <BiometricTrend rows={list} />
        </>
      )}
    </div>
  );
}
