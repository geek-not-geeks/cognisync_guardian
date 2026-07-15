import { useState } from "react";
import { MessageSquare, Camera, FileUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MediaCapture, type CapturedAsset, type MediaCaptureMode } from "@/components/media/MediaCapture";
import { BatchOCRReviewDrawer } from "@/components/modals/BatchOCRReviewDrawer";
import { QuickTextInput } from "@/components/ingestion/QuickTextInput";
import { BimodalFallback } from "@/components/ingestion/BimodalFallback";
import { parseOcr } from "@/lib/ocrParse";
import { sanitizeImageMetadata } from "@/utils/privacySanitizer";
import type { ParsedTaskPayload } from "@/types/task";

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
  const [mode, setMode] = useState<"quick-text" | MediaCaptureMode | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [initialTasks, setInitialTasks] = useState<ParsedTaskPayload[]>([]);

  const openReview = () => setReviewOpen(true);
  const closeReview = () => setReviewOpen(false);

  async function handleMediaConfirm(asset: CapturedAsset) {
    setMode(null);
    try {
      // PDPL: strip EXIF before any downstream extraction call.
      let sanitized = asset;
      if (asset.kind === "image" && asset.blob) {
        const stripped = await sanitizeImageMetadata(asset.blob);
        sanitized = { ...asset, blob: stripped, sizeBytes: stripped.size };
      }
      const result = await parseOcr(sanitized);
      if (result.ok) {
        setInitialTasks(result.payload);
        openReview();
      } else {
        setFallbackOpen(true);
      }
    } catch {
      setFallbackOpen(true);
    }
  }

  if (mode === "quick-text") {
    return (
      <>
        <QuickTextInput
          onClose={() => setMode(null)}
          onProcess={(text) => {
            setInitialTasks([
              {
                title: text.slice(0, 80) || "New Task",
                rawText: text,
                effortSize: "Standard",
                difficulty: "Challenging",
              },
            ]);
            openReview();
          }}
        />
        <BatchOCRReviewDrawer
          open={reviewOpen}
          onClose={closeReview}
          initialTasks={initialTasks}
        />
      </>
    );
  }

  if (mode) {
    return (
      <MediaCapture
        mode={mode}
        onClose={() => setMode(null)}
        onConfirm={handleMediaConfirm}
      />
    );
  }

  return (
    <>
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
                if (id === "quick-text") setMode("quick-text");
                else if (id === "camera-ocr") setMode("camera");
                else if (id === "document-upload") setMode("upload");
              }}
              className="group w-full rounded-4xl bg-surface p-6 text-left shadow-3d-base transition-all duration-200 hover:shadow-3d-pressed active:scale-[0.98] active:shadow-3d-pressed"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-deep shadow-3d-pressed">
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

      <BatchOCRReviewDrawer
        open={reviewOpen}
        onClose={closeReview}
        initialTasks={initialTasks}
      />

      <BimodalFallback
        open={fallbackOpen}
        onRetake={() => setFallbackOpen(false)}
      />
    </>
  );
}
