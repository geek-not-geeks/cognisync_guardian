import { z } from "zod";
import type { ParsedTaskPayload } from "@/types/task";
import type { CapturedAsset } from "@/components/media/MediaCapture";

export type ParseFailReason =
  | "malformed_json"
  | "low_confidence"
  | "network"
  | "unsupported_type"
  | "too_large";

export type ParseResult =
  | { ok: true; payload: ParsedTaskPayload[] }
  | { ok: false; reason: ParseFailReason };

const TaskItemSchema = z.object({
  title: z.string().min(1),
  effortSize: z.enum(["Quick", "Standard", "Deep Work"]),
  difficulty: z.enum(["Comfortable", "Challenging", "Very Hard"]),
  rawText: z.string().optional(),
  deadline: z.string().optional(),
});

const OcrResponseSchema = z.object({
  tasks: z.array(TaskItemSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export const CONFIDENCE_THRESHOLD = 0.3;

/**
 * Validate a multi-task OCR response.
 */
export function validateOcrPayload(raw: unknown): ParseResult {
  const parsed = OcrResponseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "malformed_json" };
  if (parsed.data.confidence < CONFIDENCE_THRESHOLD) {
    return { ok: false, reason: "low_confidence" };
  }
  return { ok: true, payload: parsed.data.tasks };
}

/**
 * Parse a captured asset via the vision pipeline.
 * Live GPT-4o-mini endpoint wires in a later phase. Until then, degrade
 * gracefully with a single editable stub so the user always lands in the
 * batch review drawer.
 */
export async function parseOcr(_asset: CapturedAsset): Promise<ParseResult> {
  return {
    ok: true,
    payload: [
      {
        title: "New Scanned Task",
        effortSize: "Standard",
        difficulty: "Challenging",
      },
    ],
  };
}
