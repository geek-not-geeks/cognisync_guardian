import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera, FileUp, RefreshCw, X, Check } from "lucide-react";

export type MediaCaptureMode = "camera" | "upload";

interface MediaCaptureProps {
  mode: MediaCaptureMode;
  onClose: () => void;
  onConfirm?: (asset: CapturedAsset) => void;
}

export interface CapturedAsset {
  kind: "image" | "pdf";
  /** data URL for images, object URL for uploaded files */
  previewUrl: string;
  file?: File;
  sizeBytes?: number;
  name?: string;
}

// 25 MB — support high-res syllabi and multi-page PDFs.
const MAX_BYTES = 25 * 1024 * 1024;

export function MediaCapture({ mode, onClose, onConfirm }: MediaCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [asset, setAsset] = useState<CapturedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoConstraints = useMemo(
    () => ({ facingMode: "environment" as const, width: 1920, height: 1080 }),
    [],
  );

  // Auto-open the file picker in upload mode.
  useEffect(() => {
    if (mode === "upload" && !asset) {
      fileInputRef.current?.click();
    }
  }, [mode, asset]);

  // Revoke object URLs on unmount / replacement to prevent leaks.
  useEffect(() => {
    return () => {
      if (asset?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(asset.previewUrl);
      }
    };
  }, [asset]);

  const handleSnap = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      setError("Could not capture image. Check camera permissions.");
      return;
    }
    setError(null);
    setAsset({ kind: "image", previewUrl: shot });
  }, []);

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_BYTES) {
      setError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`,
      );
      return;
    }
    setError(null);
    const isPdf = file.type === "application/pdf";
    const url = URL.createObjectURL(file);
    setAsset({
      kind: isPdf ? "pdf" : "image",
      previewUrl: url,
      file,
      sizeBytes: file.size,
      name: file.name,
    });
  }, []);

  const handleRetake = useCallback(() => {
    if (asset?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(asset.previewUrl);
    }
    setAsset(null);
    setError(null);
    if (mode === "upload") {
      // reopen picker
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }, [asset, mode]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {mode === "camera" ? "Scan Whiteboard" : "Upload File"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close capture"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E293B] text-text-secondary shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Hidden file input — supports high-res images and multi-page PDFs up to 25 MB */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Live camera — unmounted the instant we have an asset */}
      {mode === "camera" && !asset && (
        <div className="relative overflow-hidden rounded-3xl bg-black shadow-3d-base">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/webp"
            screenshotQuality={0.92}
            videoConstraints={videoConstraints}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>
      )}

      {/* Static preview — replaces the live feed to release the camera stream */}
      {asset && (
        <div className="overflow-hidden rounded-3xl bg-[#1E293B] shadow-3d-base">
          {asset.kind === "image" ? (
            <img
              src={asset.previewUrl}
              alt="Captured preview"
              className="aspect-[3/4] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] shadow-3d-pressed">
                <FileUp className="h-7 w-7 text-accent-mint" />
              </div>
              <p className="text-base font-semibold text-foreground break-all">
                {asset.name}
              </p>
              {asset.sizeBytes != null && (
                <p className="text-sm text-text-secondary">
                  {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB PDF
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-2xl bg-[#1E293B] p-4 text-sm text-governor-red shadow-3d-pressed">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 pt-2">
        {mode === "camera" && !asset && (
          <button
            type="button"
            onClick={handleSnap}
            aria-label="Capture photo"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-mint text-[#0F172A] shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
          >
            <Camera className="h-8 w-8" strokeWidth={2.5} />
          </button>
        )}

        {mode === "upload" && !asset && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 rounded-full bg-accent-mint px-8 py-4 text-base font-semibold text-[#0F172A] shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
          >
            <FileUp className="h-5 w-5" />
            Choose file
          </button>
        )}

        {asset && (
          <>
            <button
              type="button"
              onClick={handleRetake}
              aria-label="Retake"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E293B] text-text-secondary shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(asset)}
              aria-label="Confirm"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-mint text-[#0F172A] shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
            >
              <Check className="h-9 w-9" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
