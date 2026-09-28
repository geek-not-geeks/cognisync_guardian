/**
 * Hand-written types mapping the pre-deployed Supabase backend.
 * DO NOT run migrations — backend schema is owned externally.
 */

export type UserRole = "student" | "parent";
export type BurnoutTier = "Green" | "Amber" | "Red";
export type EffortSize = "Quick" | "Standard" | "Deep Work";
export type DifficultyLevel = "Comfortable" | "Challenging" | "Very Hard";
export type TaskStatus = "pending" | "completed" | "rolled_back" | "missed";

export interface UsersRow {
  id: string;
  role: UserRole;
  parent_id: string | null;
  timezone: string | null;
  display_name: string | null;
  target_study_hours: number | null;
}

export interface DailyCalibrationsRow {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  /** Mirrors `date` in the upgraded schema. */
  calibration_date?: string | null;
  energy_baseline: number;
  sleep_quality: number;
  /** NUMERIC(4,2) decimal columns from the upgraded schema. */
  sleep_hours?: number | null;
  energy_level?: number | null;
  available_study_hours: number;
  burnout_tier: BurnoutTier;
}

export interface TasksRow {
  id: string;
  user_id: string;
  title: string;
  raw_text: string | null;
  effort_size: EffortSize;
  difficulty: DifficultyLevel;
  deadline: string | null;
  status: TaskStatus;
  is_governor_locked: boolean;
  /** Student's self-rated confidence (1-5) of completing this task, set at creation. Core input to the predictive model — see /analysis. */
  confidence_rating: number | null;
  /** Timestamp of actual completion; null while open. */
  completed_at: string | null;
  /** Self-logged actual minutes spent, captured at completion (optional). */
  actual_effort_minutes: number | null;
  /** Student's post-hoc rating (1-5) of how well it actually went, independent of "completed" status. */
  self_reported_success: number | null;
}

/** Row shape for the burnout_snapshots table — persisted history of the
 * burnout calculation, one row per user per day. Without this table the
 * burnout index is computed and thrown away on every request, which makes
 * "predictive model" an unsupportable claim. See migration 0001. */
export interface BurnoutSnapshotsRow {
  id: string;
  user_id: string;
  snapshot_date: string; // YYYY-MM-DD
  exact_index: number;
  clamped_score: number;
  tier: "sustainable" | "amber" | "red";
  avg_sleep_4d: number | null;
  latest_sleep: number | null;
  energy_level: number | null;
  workload_ratio: number | null;
  recovery_ratio: number | null;
  capacity_multiplier: number | null;
  created_at: string;
}

/** Row shape for the confidence_completion_analysis view — the export-ready
 * join used by /analysis/validate_burnout_model.py */
export interface ConfidenceCompletionAnalysisRow {
  user_id: string;
  task_id: string;
  confidence_rating: number;
  difficulty: DifficultyLevel;
  effort_size: EffortSize;
  was_completed: boolean;
  self_reported_success: number | null;
  actual_effort_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  burnout_index_on_day: number | null;
  burnout_tier_on_day: "sustainable" | "amber" | "red" | null;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UsersRow;
        Insert: Partial<UsersRow> & { id: string; role: UserRole };
        Update: Partial<UsersRow>;
      };
      daily_calibrations: {
        Row: DailyCalibrationsRow;
        Insert: Omit<DailyCalibrationsRow, "id"> & { id?: string };
        Update: Partial<DailyCalibrationsRow>;
      };
      tasks: {
        Row: TasksRow;
        Insert: Omit<
          TasksRow,
          | "id"
          | "status"
          | "is_governor_locked"
          | "raw_text"
          | "deadline"
          | "confidence_rating"
          | "completed_at"
          | "actual_effort_minutes"
          | "self_reported_success"
        > & {
          id?: string;
          status?: TaskStatus;
          is_governor_locked?: boolean;
          raw_text?: string | null;
          deadline?: string | null;
          confidence_rating?: number | null;
          completed_at?: string | null;
          actual_effort_minutes?: number | null;
          self_reported_success?: number | null;
        };
        Update: Partial<TasksRow>;
      };
      burnout_snapshots: {
        Row: BurnoutSnapshotsRow;
        Insert: Omit<BurnoutSnapshotsRow, "id" | "created_at" | "snapshot_date"> & {
          id?: string;
          created_at?: string;
          snapshot_date?: string;
        };
        Update: Partial<BurnoutSnapshotsRow>;
      };
    };
    Views: {
      confidence_completion_analysis: {
        Row: ConfidenceCompletionAnalysisRow;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      burnout_tier: BurnoutTier;
      effort_size: EffortSize;
      difficulty_level: DifficultyLevel;
    };
  };
}
