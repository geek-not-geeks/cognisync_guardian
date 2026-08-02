import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/layouts/AppShell";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CogniSync" },
      { name: "description", content: "Your daily cognitive load and energy-aware task manger." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
