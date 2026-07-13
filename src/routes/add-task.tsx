import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/layouts/AppShell";
import { IngestionHub } from "@/components/ingestion/IngestionHub";

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
      <IngestionHub />
    </AppShell>
  );
}

