import { useState } from "react";
import { MessageSquare, Camera, FileUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MediaCapture, type MediaCaptureMode } from "./MediaCapture";
import { OCRReviewDrawer } from "./OCRReviewDrawer";
import { QuickTextInput } from "./QuickTextInput";


interface IngestionOption {
  id: "quick-text" | "camera-ocr" | "document-upload";
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const OPTIONS: IngestionOption[] = [
  {
    id: "quick-text",
    icon: MessageSquare,
    title: "Quick Text",
    subtitle: "Type or dictate a raw task.",
  },
  {
    id: "camera-ocr",
    icon: Camera,
    title: "Scan Whiteboard",
    subtitle: "Snap a photo of your syllabus.",
  },
  {
    id: "document-upload",
    icon: FileUp,
    title: "Upload File",
    subtitle: "PDFs or high-res images.",
  },
];

export function IngestionHub() {
  const [captureMode, setCaptureMode] = useState<MediaCaptureMode | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (captureMode) {
    return (
      <>
        <MediaCapture
          mode={captureMode}
          onClose={() => setCaptureMode(null)}
          onConfirm={() => {
            setCaptureMode(null);
            setReviewOpen(true);
          }}
        />
        <OCRReviewDrawer
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          onConfirm={() => setReviewOpen(false)}
        />
      </>
    );
  }

  return (
    <section className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">New Entry</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Choose how you want to add a task.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {OPTIONS.map(({ id, icon: Icon, title, subtitle }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "camera-ocr") setCaptureMode("camera");
              else if (id === "document-upload") setCaptureMode("upload");
            }}
            className="group w-full rounded-[32px] bg-[#1E293B] p-6 text-left shadow-3d-base transition-all duration-200 hover:shadow-3d-pressed active:scale-[0.98] active:shadow-3d-pressed"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0F172A] shadow-3d-pressed">
                <Icon className="h-6 w-6 text-accent-mint" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
