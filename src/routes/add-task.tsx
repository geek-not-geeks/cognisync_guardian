import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/add-task")({
  head: () => ({
    meta: [
      { title: "Add Task — CogniSync" },
      { name: "description", content: "Ingest tasks via text, camera OCR, or document upload." },
    ],
  }),
  component: AddTaskPage,
});

function AddTaskPage() {
  return (
    <AppShell>
      <PlaceholderPage
        title="Add Task"
        description="Text, camera, and document ingestion hub."
      />
    </AppShell>
  );
}
