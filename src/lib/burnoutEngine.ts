export type BurnoutTier = "sustainable" | "amber" | "red";

export interface BurnoutAssessment {
  tier: BurnoutTier;
  score: number; // Continuous integer from 0 to 100
  exactIndex: number; // Float precision for analytics (e.g., 24.6)
  label: string;
  actionTaken: string | null;
  capacityMultiplier: number;
}

export function calculateBurnoutTier(
  trailingStudyHoursLast4Days: number[],
  trailingSleepLast4Days: number[],
  currentEnergyLevel: number,
  todayWorkloadMinutes: number = 240,
  targetDailyMinutes: number = 360,
): BurnoutAssessment {
  const avgSleep =
    trailingSleepLast4Days.reduce((a, b) => a + Number(b), 0) /
    (trailingSleepLast4Days.length || 1);
  const latestSleep = parseFloat(
    Number(
      trailingSleepLast4Days[trailingSleepLast4Days.length - 1] || avgSleep || 7.0,
    ).toFixed(2),
  );

  // 1. Workload Density Ratio (clamped 0.5 – 1.5)
  const workloadRatio = Math.min(
    Math.max(todayWorkloadMinutes / (targetDailyMinutes || 360), 0.5),
    1.5,
  );

  // 2. Recovery Capacity Ratio against an 8.0h baseline (clamped 0.5 – 1.2)
  const recoveryRatio = Math.min(Math.max(avgSleep / 8.0, 0.5), 1.2);

  // 3. Base Math: Density vs Recovery
  let index = (workloadRatio / recoveryRatio) * 35.0;

  // 4. Acute Sleep Deficit Penalty
  if (latestSleep < 7.0) {
    index += (7.0 - latestSleep) * 14.0;
  }

  // 5. Energy Drain Penalty
  if (currentEnergyLevel < 6) {
    index += (6 - currentEnergyLevel) * 6.5;
  }

  const clampedScore = Math.min(Math.max(Math.round(index), 2), 98);
  const exactIndex = parseFloat(index.toFixed(1));

  if (clampedScore >= 75 || latestSleep <= 4.5 || currentEnergyLevel <= 2) {
    return {
      tier: "red",
      score: Math.max(clampedScore, 80),
      exactIndex,
      label: "🔴 Imminent Burnout Crash",
      actionTaken: "50% study capacity cap enforced. Complex tasks locked.",
      capacityMultiplier: 0.5,
    };
  }

  if (clampedScore >= 45 || avgSleep < 6.0 || currentEnergyLevel <= 4) {
    return {
      tier: "amber",
      score: clampedScore,
      exactIndex,
      label: "🟡 Fatigue Accumulation",
      actionTaken: "Non-urgent timelines shifted +48h for recovery room.",
      capacityMultiplier: 1.0,
    };
  }

  return {
    tier: "sustainable",
    score: clampedScore,
    exactIndex,
    label: "🟢 Sustainable Pacing",
    actionTaken: null,
    capacityMultiplier: 1.0,
  };
}
