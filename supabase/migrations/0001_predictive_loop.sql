-- Migration: Predictive Confidence-Completion Loop
-- Purpose: This migration adds the data model needed for CogniSync Guardian's
-- core research claim — that self-reported task confidence predicts actual
-- completion, and that this relationship can inform scheduling.
--
-- Before this migration, NEITHER of these existed anywhere in the schema:
--   1. A per-task confidence rating captured at creation time
--   2. Any historical record of burnout scores over time
-- Without both, "predictive model" was a description of an idea, not a
-- system. This migration makes the data model actually support the claim.

-- ============================================================
-- 1. Confidence + completion tracking on tasks
-- ============================================================

alter table public.tasks
  add column if not exists confidence_rating smallint
    check (confidence_rating between 1 and 5),
  add column if not exists completed_at timestamptz,
  add column if not exists actual_effort_minutes integer,
  add column if not exists self_reported_success smallint
    check (self_reported_success between 1 and 5);

comment on column public.tasks.confidence_rating is
  'Student''s self-rated confidence (1-5) that they will complete this task, captured at task creation. Core input to the predictive model.';
comment on column public.tasks.completed_at is
  'Timestamp of actual completion. Null while task is open. Used to compute completion rate and time-to-completion against confidence.';
comment on column public.tasks.actual_effort_minutes is
  'Optional: minutes the student actually spent, self-logged at completion. Enables confidence-vs-effort-overrun analysis, not just binary completion.';
comment on column public.tasks.self_reported_success is
  'Student''s post-hoc rating (1-5) of how well the task actually went, independent of whether it was merely "completed". Distinguishes rushed/poor completion from genuine success.';

-- The existing status enum (pending | completed | rolled_back) has no way to
-- represent a task whose deadline passed without completion. Without that,
-- an overdue never-touched task and an in-progress one are indistinguishable
-- in any completion-rate analysis. Adding 'missed' closes that gap.
-- Note: Postgres enums require this to run outside a transaction block in
-- some clients; if you hit an error running this inline with the rest of
-- the file, run this ALTER TYPE statement by itself first, then the rest.
alter type task_status add value if not exists 'missed';

-- ============================================================
-- 2. Burnout score history (time series, currently non-existent)
-- ============================================================
-- The burnout engine computes a score on every request but nothing was ever
-- persisted. Without a history table there is no way to look backward,
-- detect trends, or evaluate whether the burnout index actually correlates
-- with anything real. This table is the minimum needed for that analysis.

create table if not exists public.burnout_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  exact_index numeric(5,2) not null,
  clamped_score smallint not null,
  tier text not null check (tier in ('sustainable', 'amber', 'red')),
  avg_sleep_4d numeric(4,2),
  latest_sleep numeric(4,2),
  energy_level smallint,
  workload_ratio numeric(4,3),
  recovery_ratio numeric(4,3),
  capacity_multiplier numeric(3,2),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

comment on table public.burnout_snapshots is
  'One row per user per day capturing the full burnout calculation inputs and outputs. This is what makes the burnout index analyzable over time instead of a number that is computed and immediately discarded.';

create index if not exists idx_burnout_snapshots_user_date
  on public.burnout_snapshots (user_id, snapshot_date desc);

-- ============================================================
-- 3. Row-level security (match existing pattern on tasks/daily_calibrations)
-- ============================================================

alter table public.burnout_snapshots enable row level security;

create policy "Users can view their own burnout snapshots"
  on public.burnout_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert their own burnout snapshots"
  on public.burnout_snapshots for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. Convenience view: confidence vs completion, ready for analysis
-- ============================================================
-- This view is what you export to CSV for the regression/correlation work.
-- It deliberately only includes tasks that have been resolved one way or
-- another, since open tasks have no completion outcome yet.

create or replace view public.confidence_completion_analysis as
select
  t.user_id,
  t.id as task_id,
  t.confidence_rating,
  t.difficulty,
  t.effort_size,
  (t.status = 'completed') as was_completed,
  t.self_reported_success,
  t.actual_effort_minutes,
  t.deadline,
  t.completed_at,
  bs.exact_index as burnout_index_on_day,
  bs.tier as burnout_tier_on_day
from public.tasks t
left join public.burnout_snapshots bs
  on bs.user_id = t.user_id
  and bs.snapshot_date = coalesce(t.completed_at::date, t.deadline::date)
where t.confidence_rating is not null
  and t.status in ('completed', 'missed');

comment on view public.confidence_completion_analysis is
  'Denormalized export-ready view joining each rated task to the burnout state on its resolution day. SELECT * FROM this and export to CSV for the regression analysis in /analysis/validate_burnout_model.py';
