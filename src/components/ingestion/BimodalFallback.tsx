import { AlertTriangle } from "lucide-react";

interface BimodalFallbackProps {
  open: boolean;
  onRetake: () => void;
}

export function BimodalFallback({ open, onRetake }: BimodalFallbackProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bimodal-fallback-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-4xl border-t-4 border-warning-amber bg-surface p-6 text-center shadow-3d-base">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-deep shadow-3d-pressed">
          <AlertTriangle className="h-8 w-8 text-warning-amber" strokeWidth={2} />
        </div>

        <h2 id="bimodal-fallback-title" className="text-xl font-semibold text-foreground">
          Text Not Recognized
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          The image was too blurry or the layout was unreadable. Please capture the document
          quadrants individually.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {["Top Left", "Top Right", "Bottom Left", "Bottom Right"].map((label) => (
            <div
              key={label}
              className="flex aspect-square items-center justify-center rounded-2xl bg-slate-deep text-xs font-medium text-text-secondary shadow-3d-pressed"
            >
              {label}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onRetake}
          className="mt-8 flex w-full items-center justify-center rounded-full bg-warning-amber px-6 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed"
        >
          Retake Photos
        </button>
      </div>
    </div>
  );
}
