import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Direct Gemini provider — replaces the earlier Lovable AI Gateway proxy.
 * Previously this called https://ai.gateway.lovable.dev, which routed every
 * request (and its billing) through Lovable's infrastructure. This calls
 * Google's Generative Language API directly with our own key, so OCR/
 * syllabus parsing no longer depends on Lovable at runtime.
 */
export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey });
}
