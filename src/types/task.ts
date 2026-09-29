/**
 * Canonical shape for a task parsed from any ingestion path
 * (Quick-Text NLP, Camera OCR, or Document Upload).
 * Consumed by OCRReviewDrawer for user validation before DB persistence.
 */
import type { EffortSize, DifficultyLevel } from "@/types/database.types";

export type { EffortSize };
export type Difficulty = DifficultyLevel;

/**
 * Self-rated confidence (1-5) that the task will actually get done,
 * captured at creation time. String-typed to reuse the existing PillGroup
 * component (which is generic over string options), converted to a number
 * only at the DB boundary. This is the core input to the predictive model
 * in src/lib/predictiveAnalytics.ts - without it there is nothing to
 * correlate against completion.
 */
export type ConfidenceLevel = "1" | "2" | "3" | "4" | "5";

export interface ParsedTaskPayload {
  title: string;
  effortSize: EffortSize;
  difficulty: DifficultyLevel;
  rawText?: string;
  deadline?: string;
  confidence?: ConfidenceLevel;
}
