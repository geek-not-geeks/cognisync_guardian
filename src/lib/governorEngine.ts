import type { EffortSize, DifficultyLevel } from "@/types/database.types";

/**
 * Minimal task shape the Governor Engine needs. Compatible with TasksRow
 * and with ParsedTaskPayload once an id is attached.
 */
export interface GovernorTaskInput {
  id: string;
  title: string;
  effortSize: EffortSize | string | null;
  difficulty: DifficultyLevel | string | null;
  deadline?: string | null;
}

export interface ScheduledBlock {
  id: string;
  taskId: string;
  title: string;
  type: "work" | "recovery";
  durationMinutes: number;
  effortSize: string;
  difficulty: string;
  isOverridden: boolean;
}

export interface GovernorSchedule {
  blocks: ScheduledBlock[];
  totalWorkMinutes: number;
  totalRecoveryMinutes: number;
  overriddenTaskIds: string[];
  statusMessage: string | null;
}

export function generateDailySchedule(
  tasks: GovernorTaskInput[],
  targetHours: number = 6.0,
  sleepHours: number = 7.0,
  energyLevel: number = 5,
): GovernorSchedule {
  const maxWorkMinutes = Math.round((targetHours || 6) * 60);
  const isSleepDeprived = sleepHours < 5.0 || energyLevel <= 3;

  let currentWorkMinutes = 0;
  let currentRecoveryMinutes = 0;
  const blocks: ScheduledBlock[] = [];
  const overriddenTaskIds: string[] = [];

  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return dateA - dateB;
  });

  for (const task of sortedTasks) {
    if (currentWorkMinutes >= maxWorkMinutes) break;

    // Sleep-Deprivation Guardrail: bar "Very Hard" tasks when exhausted
    if (isSleepDeprived && task.difficulty === "Very Hard") {
      overriddenTaskIds.push(task.id);
      continue;
    }

    let blockDuration = 50;
    if (task.effortSize === "Quick") blockDuration = 25;
    if (task.effortSize === "Deep Work") blockDuration = 50;

    if (currentWorkMinutes + blockDuration > maxWorkMinutes) {
      blockDuration = maxWorkMinutes - currentWorkMinutes;
    }
    if (blockDuration <= 0) break;

    blocks.push({
      id: `${task.id}-work-${blocks.length}`,
      taskId: task.id,
      title: task.title || "Untitled Assignment",
      type: "work",
      durationMinutes: blockDuration,
      effortSize: (task.effortSize as string) || "Standard",
      difficulty: (task.difficulty as string) || "Challenging",
      isOverridden: false,
    });
    currentWorkMinutes += blockDuration;

    if (blockDuration >= 45 && currentWorkMinutes < maxWorkMinutes) {
      blocks.push({
        id: `${task.id}-rest-${blocks.length}`,
        taskId: "recovery-interval",
        title: "Cognitive Recovery Interval",
        type: "recovery",
        durationMinutes: 10,
        effortSize: "Quick",
        difficulty: "Comfortable",
        isOverridden: false,
      });
      currentRecoveryMinutes += 10;
    }
  }

  let statusMessage: string | null = null;
  if (isSleepDeprived && overriddenTaskIds.length > 0) {
    statusMessage = `Biometric Guardrail Active: ${overriddenTaskIds.length} complex task(s) postponed due to low energy/sleep baseline.`;
  }

  return {
    blocks,
    totalWorkMinutes: currentWorkMinutes,
    totalRecoveryMinutes: currentRecoveryMinutes,
    overriddenTaskIds,
    statusMessage,
  };
}
