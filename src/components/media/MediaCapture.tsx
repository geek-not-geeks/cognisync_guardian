import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera, FileUp, RefreshCw, X, Check, Video, Square } from "lucide-react";
import { compressToWebP } from "@/utils/mediaCompression";

export type MediaCaptureMode = "camera" | "upload";
type CaptureKind = "photo" | "video";

interface MediaCaptureProps {
  mode: MediaCaptureMode;
  onClose: () => void;
  onConfirm?: (asset: CapturedAsset) => void;
}

export interface CapturedAsset {
  kind: "image" | "pdf" | "video";
  /** blob: URL for uploads or recorded video; blob: URL for compressed WebP images. */
  previewUrl: string;
  blob?: Blob;
  file?: File;
  sizeBytes?: number;
  name?: string;
}

// 25 MB — support high-res syllabi and multi-page PDFs.
const MAX_BYTES = 25 * 1024 * 1024;
// 10 s hard cap on video recordings.
const MAX_VIDEO_MS = 10_000;

export function MediaCapture({ mode, onClose, onConfirm }: MediaCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [asset, setAsset] = useState<CapturedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captureKind, setCaptureKind] = useState<CaptureKind>("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);

  const videoConstraints = useMemo(
    () => ({ facingMode: "environment" as const, width: 1080, height: 1920 }),
    [],
  );

  /**
   * Terminate every active MediaStream track. Called on unmount and whenever
   * the live camera should transition off (asset captured, upload mode).
   * Prevents the browser's red camera indicator from lingering and stops
   * hardware battery drain on mobile PWAs.
   */
  const stopMediaTracks = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      }
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  }, []);

  // Trigger file picker automatically in upload mode.
  useEffect(() => {
    if (mode === "upload" && !asset) fileInputRef.current?.click();
  }, [mode, asset]);

  // Kill the live camera the moment we have a preview or leave camera mode.
  useEffect(() => {
    if (mode !== "camera" || asset) stopMediaTracks();
  }, [mode, asset, stopMediaTracks]);

  // Global cleanup on unmount: hardware release + blob URL revocation.
  useEffect(() => {
    return () => {
      stopMediaTracks();
    };
  }, [stopMediaTracks]);

  useEffect(() => {
    const url = asset?.previewUrl;
    return () => {
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [asset?.previewUrl]);

  const handleSnap = useCallback(async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      setError("Could not capture image. Check camera permissions.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const blob = await compressToWebP(shot);
      const url = URL.createObjectURL(blob);
      setAsset({ kind: "image", previewUrl: url, blob, sizeBytes: blob.size, name: "capture.webp" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setIsRecording(false);
  }, []);

  const handleStartRecording = useCallback(() => {
    const stream = streamRef.current ?? webcamRef.current?.stream ?? null;
    if (!stream) {
      setError("Camera stream not ready.");
      return;
    }
    setError(null);
    videoChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setAsset({ kind: "video", previewUrl: url, blob, sizeBytes: blob.size, name: "clip.webm" });
    };
    recorder.start();
    setIsRecording(true);
    setRecordElapsed(0);
    const startedAt = Date.now();
    recordIntervalRef.current = setInterval(() => {
      setRecordElapsed(Math.min(MAX_VIDEO_MS, Date.now() - startedAt));
    }, 100);
    // Hard 10 s cap.
    recordTimerRef.current = setTimeout(stopRecording, MAX_VIDEO_MS);
  }, [stopRecording]);

  const handleFile = useCallback(async (file: File) => {
    // Explicitly permissive: syllabus scans and multi-page PDFs are large.
    if (file.size > MAX_BYTES) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      return;
    }
    setError(null);
    const isPdf = file.type === "application/pdf";
    if (isPdf) {
      const url = URL.createObjectURL(file);
      setAsset({ kind: "pdf", previewUrl: url, file, sizeBytes: file.size, name: file.name });
      return;
    }
    setBusy(true);
    try {
      const blob = await compressToWebP(file);
      const url = URL.createObjectURL(blob);
      setAsset({
        kind: "image",
        previewUrl: url,
        blob,
        sizeBytes: blob.size,
        name: file.name.replace(/\.[^.]+$/, "") + ".webp",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleRetake = useCallback(() => {
    if (asset?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(asset.previewUrl);
    setAsset(null);
    setError(null);
    setRecordElapsed(0);
    if (mode === "upload") setTimeout(() => fileInputRef.current?.click(), 0);
  }, [asset, mode]);

  const recordSecondsLeft = Math.ceil((MAX_VIDEO_MS - recordElapsed) / 1000);

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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-secondary shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Photo / Video mode toggle */}
      {mode === "camera" && !asset && (
        <div className="mx-auto flex w-fit gap-2 rounded-full bg-surface p-1 shadow-3d-pressed">
          {(["photo", "video"] as const).map((k) => (
            <button
              key={k}
              type="button"
              disabled={isRecording}
              onClick={() => setCaptureKind(k)}
              className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition-all ${
                captureKind === k
                  ? "bg-accent-mint text-slate-deep shadow-3d-base"
                  : "text-text-secondary"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Live camera — strict 9:16 portrait */}
      {mode === "camera" && !asset && (
        <div className="relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-3xl bg-black shadow-3d-base">
          <Webcam
            ref={webcamRef}
            audio={captureKind === "video"}
            screenshotFormat="image/webp"
            screenshotQuality={0.92}
            videoConstraints={videoConstraints}
            onUserMedia={(stream) => {
              streamRef.current = stream;
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isRecording && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-governor-red align-middle" />
              REC · {recordSecondsLeft}s
            </div>
          )}
        </div>
      )}

      {/* Static preview */}
      {asset && (
        <div className="mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-3d-base">
          {asset.kind === "image" ? (
            <img src={asset.previewUrl} alt="Captured preview" className="h-full w-full object-cover" />
          ) : asset.kind === "video" ? (
            <video src={asset.previewUrl} controls playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-deep shadow-3d-pressed">
                <FileUp className="h-7 w-7 text-accent-mint" />
              </div>
              <p className="break-all text-base font-semibold text-foreground">{asset.name}</p>
              {asset.sizeBytes != null && (
                <p className="text-sm text-text-secondary">
                  {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB PDF
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {asset?.sizeBytes != null && asset.kind === "image" && (
        <p className="text-center text-xs text-text-secondary">
          Compressed to {(asset.sizeBytes / 1024).toFixed(0)} KB · WebP
        </p>
      )}

      {error && (
        <p className="rounded-2xl bg-surface p-4 text-sm text-governor-red shadow-3d-pressed">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 pt-2">
        {mode === "camera" && !asset && captureKind === "photo" && (
          <button
            type="button"
            onClick={handleSnap}
            disabled={busy}
            aria-label="Capture photo"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-mint text-slate-deep shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all disabled:opacity-60"
          >
            <Camera className="h-8 w-8" strokeWidth={2.5} />
          </button>
        )}

        {mode === "camera" && !asset && captureKind === "video" && (
          <button
            type="button"
            onClick={isRecording ? stopRecording : handleStartRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-slate-deep shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all ${
              isRecording ? "bg-governor-red text-white" : "bg-accent-mint"
            }`}
          >
            {isRecording ? <Square className="h-7 w-7" strokeWidth={2.5} /> : <Video className="h-8 w-8" strokeWidth={2.5} />}
          </button>
        )}

        {mode === "upload" && !asset && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 rounded-full bg-accent-mint px-8 py-4 text-base font-semibold text-slate-deep shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-text-secondary shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(asset)}
              aria-label="Confirm"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-mint text-slate-deep shadow-3d-base active:shadow-3d-pressed active:scale-95 transition-all"
            >
              <Check className="h-9 w-9" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
