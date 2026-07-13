/**
 * Canonical shape for a task parsed from any ingestion path
 * (Quick-Text NLP, Camera OCR, or Document Upload).
 * Consumed by OCRReviewDrawer for user validation before DB persistence.
 */
import type { EffortSize, DifficultyLevel } from "@/types/database.types";

export type { EffortSize };
export type Difficulty = DifficultyLevel;

export interface ParsedTaskPayload {
  title: string;
  effortSize: EffortSize;
  difficulty: DifficultyLevel;
  rawText?: string;
  deadline?: string;
}
