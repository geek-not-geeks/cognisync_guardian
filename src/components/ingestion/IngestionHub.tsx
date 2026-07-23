import { useState } from "react";
import { MessageSquare, Camera, FileUp, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { MediaCapture, type CapturedAsset, type MediaCaptureMode } from "@/components/media/MediaCapture";
import { BatchOCRReviewDrawer } from "@/components/modals/BatchOCRReviewDrawer";
import { QuickTextInput } from "@/components/ingestion/QuickTextInput";
import { BimodalFallback } from "@/components/ingestion/BimodalFallback";
import { parseOcrAsset } from "@/lib/ocrParse";
import { sanitizeImageMetadata } from "@/utils/privacySanitizer";
import { extractDateFromTitle } from "@/utils/dateParser";
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
  const [drawerWarning, setDrawerWarning] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const openReview = (warning: string | null = null) => {
    setDrawerWarning(warning);
    setReviewOpen(true);
  };
  const closeReview = () => {
    setReviewOpen(false);
    setDrawerWarning(null);
  };

  async function handleMediaConfirm(asset: CapturedAsset) {
    setMode(null);
    setParsing(true);
    try {
      // PDPL: strip EXIF only for raster images (PDFs bypass canvas rasterizer).
      let outgoingBlob: Blob | undefined;
      let mimeType: string | undefined;
      if (asset.kind === "image" && asset.blob) {
        outgoingBlob = await sanitizeImageMetadata(asset.blob);
        mimeType = outgoingBlob.type || "image/webp";
      } else if (asset.file) {
        outgoingBlob = asset.file;
        mimeType = asset.file.type;
      } else if (asset.blob) {
        outgoingBlob = asset.blob;
        mimeType = asset.blob.type;
      }

      const result = await parseOcrAsset({ blob: outgoingBlob, mimeType });

      if (result.ok && result.payload) {
        setInitialTasks(result.payload);
        openReview();
        return;
      }

      if (result.reason === "low_confidence" && result.payload && result.payload.length > 0) {
        setInitialTasks(result.payload);
        openReview("⚠️ Low scan clarity. Please verify extracted titles and dates below.");
        return;
      }

      toast.error("Could not read syllabus automatically. Please select quadrants or enter manually.");
      setFallbackOpen(true);
    } catch {
      toast.error("Could not read syllabus automatically. Please select quadrants or enter manually.");
      setFallbackOpen(true);
    } finally {
      setParsing(false);
    }
  }

  async function handleQuickText(text: string) {
    setMode(null);
    setParsing(true);
    try {
      const result = await parseOcrAsset({ rawText: text });
      if (result.ok && result.payload && result.payload.length > 0) {
        setInitialTasks(result.payload);
        openReview();
        return;
      }
      if (result.reason === "low_confidence" && result.payload && result.payload.length > 0) {
        setInitialTasks(result.payload);
        openReview("⚠️ Low extraction confidence. Please verify below.");
        return;
      }
      // Graceful local fallback: single editable card seeded from the raw text.
      const { cleanTitle, extractedDeadline } = extractDateFromTitle(text);
      setInitialTasks([
        {
          title: (cleanTitle || text).slice(0, 80) || "New Task",
          rawText: text,
          deadline: extractedDeadline || "Tomorrow 5pm",
          effortSize: "Standard",
          difficulty: "Challenging",
        },
      ]);
      openReview(result.reason ? "⚠️ AI unavailable — review manually before syncing." : null);
    } catch {
      const { cleanTitle, extractedDeadline } = extractDateFromTitle(text);
      setInitialTasks([
        {
          title: (cleanTitle || text).slice(0, 80) || "New Task",
          rawText: text,
          deadline: extractedDeadline || "Tomorrow 5pm",
          effortSize: "Standard",
          difficulty: "Challenging",
        },
      ]);
      openReview("⚠️ AI unavailable — review manually before syncing.");
    } finally {
      setParsing(false);
    }
  }

  if (parsing) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface shadow-3d-pressed">
          <Loader2 className="h-8 w-8 animate-spin text-accent-mint" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Analyzing…</p>
          <p className="mt-1 text-sm text-text-secondary">
            Securely extracting tasks via the edge gateway.
          </p>
        </div>
      </section>
    );
  }

  if (mode === "quick-text") {
    return (
      <>
        <QuickTextInput
          onClose={() => setMode(null)}
          onProcess={handleQuickText}
        />
        <BatchOCRReviewDrawer
          open={reviewOpen}
          onClose={closeReview}
          initialTasks={initialTasks}
          warningMessage={drawerWarning}
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
