/**
 * Enterprise pre-flight media optimizer & gatekeeper.
 *
 * - Strict MIME allow-list + 10 MB hard ceiling.
 * - PDFs bypass the canvas rasterizer entirely (prevents browser crashes).
 * - Raster images are redrawn on an HTML5 canvas, which implicitly strips
 *   EXIF/GPS metadata (UAE PDPL compliance) and downscales to 1600px max edge.
 */

export interface OptimizedAsset {
  file: File;
  /** Clean Base64 payload WITHOUT the `data:<mime>;base64,` prefix. */
  base64Data: string;
  mimeType: string;
  sizeBytes: number;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB hard ceiling
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

export async function optimizeAndSanitizeAsset(rawFile: File): Promise<OptimizedAsset> {
  if (!ALLOWED_MIMES.includes(rawFile.type)) {
    throw new Error("Invalid file format. Please upload a JPEG, PNG, WebP, or PDF document.");
  }
  if (rawFile.size > MAX_BYTES) {
    throw new Error("File exceeds the 10MB enterprise security limit.");
  }

  // PDF documents: transmit as-is, no canvas rasterization.
  if (rawFile.type === "application/pdf") {
    const base64 = await fileToCleanBase64(rawFile);
    return {
      file: rawFile,
      base64Data: base64,
      mimeType: "application/pdf",
      sizeBytes: rawFile.size,
    };
  }

  return new Promise<OptimizedAsset>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(rawFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Browser Canvas rendering failed."));
        return;
      }

      // Drawing to canvas automatically strips EXIF/GPS metadata (PDPL).
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed."));
            return;
          }
          const optimizedFile = new File(
            [blob],
            rawFile.name.replace(/\.[^/.]+$/, "") + ".webp",
            { type: "image/webp" },
          );
          fileToCleanBase64(optimizedFile)
            .then((base64) =>
              resolve({
                file: optimizedFile,
                base64Data: base64,
                mimeType: "image/webp",
                sizeBytes: blob.size,
              }),
            )
            .catch(reject);
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for optimization."));
    };

    img.src = objectUrl;
  });
}

export function fileToCleanBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("File reading failed."));
    reader.readAsDataURL(file);
  });
}
