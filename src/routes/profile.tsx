import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlaceholderPage } from "@/components/PlaceholderPage";

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
  return (
    <AppShell>
      <PlaceholderPage
        title="Profile"
        description="Account and calibration preferences."
      />
    </AppShell>
  );
}
