/**
 * UAE PDPL client-side data sanitizer.
 *
 * Strips personal identifiers from raw text and image metadata BEFORE any
 * transmission to server-side OCR / LLM pipelines. Pure functions, zero
 * side-effects, unit-testable.
 *
 * Biometric decoupling contract: sleep_quality and energy_baseline are
 * biometric under PDPL and MUST live only in `daily_calibrations`. They
 * must never appear in the `users` table selection, any profile share
 * payload, or any parent-facing individual assignment payload.
 */

export type SanitizeFlag =
  | "id_number"
  | "email"
  | "phone"
  | "labeled_name";

export interface SanitizeResult {
  clean: string;
  flagged: SanitizeFlag[];
}

const PATTERNS: { flag: SanitizeFlag; regex: RegExp; token: string }[] = [
  {
    flag: "email",
    regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    token: "[REDACTED_EMAIL]",
  },
  {
    // E.164 (+9715XXXXXXXX) and local UAE 05X-XXXX-XXX / 04-XXX-XXXX forms.
    flag: "phone",
    regex: /(\+?\d[\d\s\-()]{7,}\d)/g,
    token: "[REDACTED_PHONE]",
  },
  {
    // 8+ digit numeric runs: Emirates ID, school ID, student number.
    flag: "id_number",
    regex: /\b\d{8,}\b/g,
    token: "[REDACTED_ID]",
  },
  {
    // "Name: Jane Doe", "Student: John Smith", "Pupil - Aisha Al Marzouqi".
    flag: "labeled_name",
    regex: /\b(name|student|pupil|learner)\s*[:\-]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z']+){0,3}/gi,
    token: "[REDACTED_NAME]",
  },
];

export function sanitizeText(input: string): SanitizeResult {
  let clean = input;
  const flagged: SanitizeFlag[] = [];
  for (const { flag, regex, token } of PATTERNS) {
    if (regex.test(clean)) {
      flagged.push(flag);
      regex.lastIndex = 0;
      clean = clean.replace(regex, token);
    }
  }
  return { clean, flagged };
}

/**
 * Strip EXIF and any embedded metadata by re-encoding through a canvas.
 * Canvas re-encoding drops all non-pixel metadata (GPS, camera serial,
 * timestamps, thumbnails). Returns a WebP blob.
 */
export async function sanitizeImageMetadata(blob: Blob): Promise<Blob> {
  if (typeof window === "undefined") return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0);
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.92),
    );
    return out ?? blob;
  } finally {
    bitmap.close();
  }
}
