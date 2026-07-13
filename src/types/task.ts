/**
 * Canonical shape for a task parsed from any ingestion path
 * (Quick-Text NLP, Camera OCR, or Document Upload).
 * Consumed by OCRReviewDrawer for user validation before DB persistence.
 */
export type EffortSize = "Quick" | "Standard" | "Deep Work";
export type Difficulty = "Comfortable" | "Challenging" | "Very Hard";

export interface ParsedTaskPayload {
  title: string;
  effortSize: EffortSize;
  difficulty: Difficulty;
  rawText?: string;
  deadline?: string;
}
