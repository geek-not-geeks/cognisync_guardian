export type BurnoutTier = "sustainable" | "amber" | "red";

export interface BurnoutAssessment {
  tier: BurnoutTier;
  score: number; // 0 to 100
  label: string;
  actionTaken: string | null;
  capacityMultiplier: number; // 1.0 for Green/Amber, 0.5 for Red
}

export function calculateBurnoutTier(
  trailingStudyHoursLast4Days: number[],
  trailingSleepLast4Days: number[],
  currentEnergyLevel: number,
): BurnoutAssessment {
  const avgStudy =
    trailingStudyHoursLast4Days.reduce((a, b) => a + b, 0) /
    (trailingStudyHoursLast4Days.length || 1);
  const avgSleep =
    trailingSleepLast4Days.reduce((a, b) => a + b, 0) /
    (trailingSleepLast4Days.length || 1);

  // Red State: Severe sleep deficit or acute exhaustion
  if (avgSleep < 5.0 || currentEnergyLevel <= 2) {
    return {
      tier: "red",
      score: 85,
      label: "🔴 Imminent Burnout Crash",
      actionTaken: "50% capacity cap enforced. Non-essential deep work barred.",
      capacityMultiplier: 0.5,
    };
  }

  // Amber State: Workload outstrips recovery
  if (avgStudy > avgSleep * 1.2 || currentEnergyLevel <= 4) {
    return {
      tier: "amber",
      score: 55,
      label: "🟡 Fatigue Accumulation",
      actionTaken: "Non-urgent timelines shifted +48h to create recovery room.",
      capacityMultiplier: 1.0,
    };
  }

  return {
    tier: "sustainable",
    score: 15,
    label: "🟢 Sustainable Pacing",
    actionTaken: null,
    capacityMultiplier: 1.0,
  };
}
