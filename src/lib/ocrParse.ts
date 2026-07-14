import { z } from "zod";
import type { ParsedTaskPayload } from "@/types/task";
import type { CapturedAsset } from "@/components/media/MediaCapture";

export type ParseFailReason =
  | "malformed_json"
  | "low_confidence"
  | "network";

export type ParseResult =
  | { ok: true; payload: ParsedTaskPayload; confidence: number }
  | { ok: false; reason: ParseFailReason };

const OcrResponseSchema = z.object({
  title: z.string().min(1),
  effortSize: z.enum(["Quick", "Standard", "Deep Work"]),
  difficulty: z.enum(["Comfortable", "Challenging", "Very Hard"]),
  rawText: z.string().optional(),
  deadline: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

// Relaxed threshold: never trap the user in an error modal. Anything below
// this simply becomes a low-confidence success routed to the review drawer
// with whatever text we recovered (or a safe default title).
export const CONFIDENCE_THRESHOLD = 0.3;

/**
 * Validate an OCR response payload against the strict schema.
 * Exposed for direct use when a live endpoint is wired.
 */
export function validateOcrPayload(raw: unknown): ParseResult {
  const parsed = OcrResponseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "malformed_json" };
  if (parsed.data.confidence < CONFIDENCE_THRESHOLD) {
    return { ok: false, reason: "low_confidence" };
  }
  const { confidence, ...payload } = parsed.data;
  return { ok: true, payload, confidence };
}

/**
 * Parse a captured asset via the vision pipeline.
 * The live GPT-4o-mini Edge Function is wired in a later phase. Until then,
 * we degrade gracefully: return an editable stub so the user lands in the
 * review drawer instead of a bimodal fallback loop.
 */
export async function parseOcr(_asset: CapturedAsset): Promise<ParseResult> {
  return {
    ok: true,
    payload: {
      title: "New Scanned Task",
      effortSize: "Standard",
      difficulty: "Challenging",
    },
    confidence: CONFIDENCE_THRESHOLD,
  };
}

