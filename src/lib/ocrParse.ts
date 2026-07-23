import { supabase } from "@/lib/supabase";
import type { ParsedTaskPayload } from "@/types/task";

export interface ParseResult {
  ok: boolean;
  payload?: ParsedTaskPayload[];
  confidence?: number;
  reason?: string;
}

export interface ParseAssetInput {
  /** Sanitized image/PDF blob to transmit (post-EXIF-strip). */
  blob?: Blob;
  /** Explicit MIME type override (else derived from blob). */
  mimeType?: string;
  /** Raw text ingestion path. */
  rawText?: string;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Live invocation of the `parse-syllabus` Supabase Edge Function.
 * Client-side bridge: streams sanitized image / raw text upstream, receives
 * structured `ParsedTaskPayload[]`. Never surfaces AI credentials.
 */
export async function parseOcrAsset(asset: ParseAssetInput): Promise<ParseResult> {
  try {
    let imageBase64: string | undefined;
    let mimeType: string | undefined = asset.mimeType;

    if (asset.blob) {
      mimeType = mimeType ?? asset.blob.type;
      imageBase64 = await blobToDataUrl(asset.blob);
    }

    const { data, error } = await supabase.functions.invoke("parse-syllabus", {
      body: { imageBase64, rawText: asset.rawText, mimeType },
    });

    if (error) {
      return { ok: false, reason: error.message || "Network timeout or gateway error." };
    }

    if (!data || !data.ok) {
      return { ok: false, reason: data?.reason || "AI extraction could not resolve text." };
    }

    const payload: ParsedTaskPayload[] = Array.isArray(data.payload) ? data.payload : [];
    const confidence: number = typeof data.confidence === "number" ? data.confidence : 0.9;

    if (confidence < CONFIDENCE_THRESHOLD) {
      return { ok: false, reason: "low_confidence", payload, confidence };
    }

    return { ok: true, payload, confidence };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Unexpected client parsing exception.",
    };
  }
}
