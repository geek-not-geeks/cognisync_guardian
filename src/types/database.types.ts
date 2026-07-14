/**
 * Hand-written types mapping the pre-deployed Supabase backend.
 * DO NOT run migrations — backend schema is owned externally.
 */

export type UserRole = "student" | "parent";
export type BurnoutTier = "Green" | "Amber" | "Red";
export type EffortSize = "Quick" | "Standard" | "Deep Work";
export type DifficultyLevel = "Comfortable" | "Challenging" | "Very Hard";
export type TaskStatus = "pending" | "completed" | "rolled_back";

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
  energy_baseline: number;
  sleep_quality: number;
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
        Insert: Omit<TasksRow, "id" | "status" | "is_governor_locked" | "raw_text" | "deadline"> & {
          id?: string;
          status?: TaskStatus;
          is_governor_locked?: boolean;
          raw_text?: string | null;
          deadline?: string | null;
        };
        Update: Partial<TasksRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      burnout_tier: BurnoutTier;
      effort_size: EffortSize;
      difficulty_level: DifficultyLevel;
    };
  };
}
