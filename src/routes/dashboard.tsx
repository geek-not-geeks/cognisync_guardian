import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/layouts/AppShell";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CogniSync" },
      { name: "description", content: "Your daily execution map and cognitive load overview." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <PlaceholderPage
        title="Dashboard"
        description="Your daily execution map."
      />
    </AppShell>
  );
}
