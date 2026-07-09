import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">CogniSync</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Cognitive Load & Burnout Prevention
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Adaptive scheduling that respects human energy.
        </p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-surface p-6">
          <p className="text-sm text-text-secondary">
            Use the bottom navigation to move between Dashboard, Add Task, Status, and Profile.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent-mint px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
