import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { EnergySandbox } from "@/components/EnergySandbox";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">CogniSync</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Cognitive Load & Burnout Prevention
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Adaptive scheduling that respects human energy.
          </p>
        </div>

        <EnergySandbox />

        <div className="rounded-xl border border-slate-800 bg-surface p-6">
          <p className="text-sm text-text-secondary">
            Ready to protect your schedule? Create an account or explore the dashboard.
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
