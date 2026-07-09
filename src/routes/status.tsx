import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — CogniSync" },
      { name: "description", content: "Burnout tier and cognitive load status." },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  return (
    <AppShell>
      <PlaceholderPage
        title="Status"
        description="Burnout tier and trailing cognitive load."
      />
    </AppShell>
  );
}
