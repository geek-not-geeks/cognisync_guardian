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

        <div className="rounded-[32px] bg-[#1E293B] p-6 shadow-3d-base">
          <p className="text-sm text-text-secondary">
            Ready to protect your schedule? Create an account or explore the dashboard.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-accent-mint px-6 py-3 text-sm font-semibold text-background shadow-3d-base transition-transform active:scale-[0.98]"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
