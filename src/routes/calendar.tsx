import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { localDateString } from "@/utils/authErrors";
import type { DifficultyLevel, EffortSize, TasksRow } from "@/types/database.types";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — CogniSync" },
      {
        name: "description",
        content: "Your workload laid out by day, not just crammed into today.",
      },
    ],
  }),
  component: CalendarPage,
});

const effortColor: Record<EffortSize, string> = {
  Quick: "bg-accent-mint/20 text-accent-mint",
  Standard: "bg-warning-amber/20 text-warning-amber",
  "Deep Work": "bg-governor-red/20 text-governor-red",
};

const difficultyDot: Record<DifficultyLevel, string> = {
  Comfortable: "bg-accent-mint",
  Challenging: "bg-warning-amber",
  "Very Hard": "bg-governor-red",
};

interface DayBucket {
  key: string;
  label: string;
  isToday: boolean;
  tasks: TasksRow[];
}

/**
 * Groups tasks by the local calendar date of their deadline, independent of
 * the governor's capacity-based "Today's Pacing" list. This is the piece
 * that was actually missing: the dashboard only ever showed "everything
 * currently fits in today's capacity", with no way to see what's due
 * tomorrow, next week, or later, or to tell a task's actual due date apart
 * from when it happened to get pulled into today's plan.
 */
function buildBuckets(tasks: TasksRow[]): {
  overdue: TasksRow[];
  days: DayBucket[];
  noDeadline: TasksRow[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateString(today);

  const overdue: TasksRow[] = [];
  const noDeadline: TasksRow[] = [];
  const byDay = new Map<string, TasksRow[]>();

  const days: DayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = localDateString(d);
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    days.push({ key, label, isToday: i === 0, tasks: [] });
    byDay.set(key, []);
  }

  for (const t of tasks) {
    if (!t.deadline) {
      noDeadline.push(t);
      continue;
    }
    const d = new Date(t.deadline);
    if (Number.isNaN(d.getTime())) {
      noDeadline.push(t);
      continue;
    }
    const key = localDateString(d);
    if (key < todayKey && t.status === "pending") {
      overdue.push(t);
    } else if (byDay.has(key)) {
      byDay.get(key)!.push(t);
    } else if (key < todayKey) {
      // Past date, but not pending (completed late / rolled back) — skip
      // from the 7-day grid, not overdue-relevant, not worth cluttering.
      continue;
    } else {
      // Beyond the 7-day window — group into the last visible day's
      // overflow rather than inventing more buckets; keeps the view to a
      // fixed, scannable week.
      days[days.length - 1].tasks.push(t);
    }
  }

  for (const day of days) {
    const fromMap = byDay.get(day.key) ?? [];
    day.tasks = [...fromMap, ...day.tasks].sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    });
  }

  return { overdue, days, noDeadline };
}

function TaskRow({ task }: { task: TasksRow }) {
  const isDone = task.status === "completed";
  return (
    <li
      className={`mb-2 flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 shadow-3d-base ${
        isDone ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${difficultyDot[task.difficulty]}`}
            aria-hidden
          />
          <p
            className={`truncate text-sm font-medium text-foreground ${
              isDone ? "line-through" : ""
            }`}
          >
            {task.title}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${effortColor[task.effort_size]}`}
          >
            {task.effort_size}
          </span>
          {task.confidence_rating != null && (
            <span className="inline-flex rounded-full bg-slate-deep px-2 py-0.5 text-[9px] font-semibold text-text-secondary">
              Confidence {task.confidence_rating}/5
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function CalendarPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", userId, "calendar"],
    enabled: !!userId,
    queryFn: async (): Promise<TasksRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId!)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TasksRow[] | null) ?? [];
    },
  });

  const { overdue, days, noDeadline } = useMemo(
    () => buildBuckets(tasks ?? []),
    [tasks],
  );

  return (
    <AppShell>
      <div className="space-y-6 p-4">
        <header className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent-mint" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
            <p className="text-xs text-text-secondary">
              Everything on your plate, by the day it's actually due — separate
              from today's capacity-limited pacing.
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="h-48 animate-pulse rounded-3xl bg-surface/60 shadow-3d-base" />
        ) : (
          <>
            {overdue.length > 0 && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-governor-red" />
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-governor-red">
                    Overdue ({overdue.length})
                  </h2>
                </div>
                <ul>
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              </section>
            )}

            {days.map((day) => (
              <section key={day.key}>
                <h2
                  className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                    day.isToday ? "text-accent-mint" : "text-text-secondary"
                  }`}
                >
                  {day.label}
                  {day.tasks.length > 0 ? ` (${day.tasks.length})` : ""}
                </h2>
                {day.tasks.length === 0 ? (
                  <p className="text-xs text-text-secondary/60">Nothing due.</p>
                ) : (
                  <ul>
                    {day.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {noDeadline.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  No Deadline ({noDeadline.length})
                </h2>
                <ul>
                  {noDeadline.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
