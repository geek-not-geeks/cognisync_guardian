/**
 * Pure HTML5-Canvas image compression. No external deps.
 * Iteratively scales down and lowers quality until the output fits under
 * `maxBytes` (default 2 MB) as an `image/webp` blob.
 */

export interface CompressOptions {
  /** Hard cap on output size in bytes. Default 2 MB. */
  maxBytes?: number;
  /** Longest-edge cap in CSS pixels. Default 2400. */
  maxDimension?: number;
  /** Starting quality (0–1). Default 0.9. */
  initialQuality?: number;
  /** Max compression attempts before returning the smallest we got. Default 8. */
  maxAttempts?: number;
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_DIM = 2400;

async function sourceToDataUrl(source: Blob | File | string): Promise<string> {
  if (typeof source === "string") return source;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(source);
  });
}

async function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to decode image"));
    el.src = dataUrl;
  });
}

export async function compressToWebP(
  source: Blob | File | string,
  opts: CompressOptions = {},
): Promise<Blob> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDim = opts.maxDimension ?? DEFAULT_MAX_DIM;
  const maxAttempts = opts.maxAttempts ?? 8;

  const dataUrl = await sourceToDataUrl(source);
  const img = await decodeImage(dataUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  let scale = 1;
  let quality = opts.initialQuality ?? 0.9;
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest > maxDim) scale = maxDim / longest;

  let smallest: Blob | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );

    if (blob) {
      if (blob.size <= maxBytes) return blob;
      if (!smallest || blob.size < smallest.size) smallest = blob;
    }

    // Alternate dropping quality then scaling to converge quickly.
    if (attempt % 2 === 0) quality = Math.max(0.4, quality - 0.15);
    else scale *= 0.8;
  }

  if (smallest) return smallest;
  throw new Error("Compression failed");
}
