import { describe, it, expect } from "vitest";
import { generateDailySchedule, GUARDRAIL_REASON, type GovernorTaskInput } from "../governorEngine";

function task(overrides: Partial<GovernorTaskInput> & { id: string }): GovernorTaskInput {
  return {
    title: overrides.id,
    effortSize: "Standard",
    difficulty: "Challenging",
    deadline: null,
    ...overrides,
  };
}

describe("generateDailySchedule", () => {
  it("schedules all tasks normally when the student is not fatigued", () => {
    const tasks = [
      task({ id: "t1", effortSize: "Deep Work", difficulty: "Very Hard" }),
      task({ id: "t2", effortSize: "Quick", difficulty: "Comfortable" }),
    ];
    const result = generateDailySchedule(tasks, 6, 8, 8, 10); // well-rested, low burnout
    expect(result.postponedBlocks).toHaveLength(0);
    expect(result.blocks.some((b) => b.taskId === "t1")).toBe(true);
    expect(result.statusMessage).toBeNull();
  });

  it("activates the guardrail and postpones Deep Work / Very Hard tasks under acute sleep deprivation", () => {
    const tasks = [
      task({ id: "heavy1", effortSize: "Deep Work", difficulty: "Very Hard" }),
      task({ id: "light1", effortSize: "Quick", difficulty: "Comfortable" }),
    ];
    // sleepHours < 5.0 triggers isSleepDeprived regardless of energyLevel/burnoutScore
    const result = generateDailySchedule(tasks, 6, 4.0, 8, 0);
    expect(result.overriddenTaskIds).toContain("heavy1");
    expect(result.postponedBlocks[0].reason).toBe(GUARDRAIL_REASON);
    // the light task should still be scheduled - guardrail targets heavy tasks specifically
    expect(result.blocks.some((b) => b.taskId === "light1")).toBe(true);
  });

  it("activates the guardrail on low energy alone (<=3), even with good sleep", () => {
    const tasks = [task({ id: "heavy1", effortSize: "Deep Work" })];
    const result = generateDailySchedule(tasks, 6, 8, 3, 0);
    expect(result.overriddenTaskIds).toContain("heavy1");
  });

  it("activates red-state lockout on burnoutScore >= 75 regardless of sleep/energy inputs", () => {
    const tasks = [task({ id: "heavy1", difficulty: "Very Hard" })];
    const result = generateDailySchedule(tasks, 6, 8, 8, 80);
    expect(result.overriddenTaskIds).toContain("heavy1");
    expect(result.statusMessage).toMatch(/Red State Lockout/);
  });

  /**
   * FINDING, not a bug fix: the product description says the guardrail
   * locks tasks "tagged Deep Work or Very Hard". The actual isHeavy check
   * also matches difficulty === "Challenging" - and since DifficultyLevel
   * is only Comfortable | Challenging | Very Hard, that means a red state
   * locks out 2 of the 3 difficulty tiers, not a narrow "hardest tasks
   * only" subset. This test documents the REAL behavior so it can't drift
   * silently. Decide deliberately whether this is intended (aggressive
   * protection is arguably the right call for a burnout tool) or too
   * broad, rather than leaving it as an undocumented side effect.
   */
  it("FINDING: 'Challenging' difficulty tasks ARE also postponed by the guardrail (only 'Comfortable' survives a red state)", () => {
    const tasks = [
      task({ id: "challenging1", effortSize: "Standard", difficulty: "Challenging" }),
      task({ id: "comfortable1", effortSize: "Standard", difficulty: "Comfortable" }),
    ];
    const result = generateDailySchedule(tasks, 6, 8, 8, 90);
    expect(result.overriddenTaskIds).toContain("challenging1");
    expect(result.overriddenTaskIds).not.toContain("comfortable1");
  });

  it("stops scheduling once targetHours worth of work minutes is reached", () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      task({ id: `t${i}`, effortSize: "Standard" }),
    );
    const result = generateDailySchedule(tasks, 1, 8, 8, 0); // only 60 minutes available
    expect(result.totalWorkMinutes).toBeLessThanOrEqual(60);
  });

  it("inserts a 10-minute recovery interval after work blocks of 45+ minutes", () => {
    const tasks = [task({ id: "t1", effortSize: "Standard" })]; // 50 min block
    const result = generateDailySchedule(tasks, 2, 8, 8, 0);
    const recoveryBlocks = result.blocks.filter((b) => b.type === "recovery");
    expect(recoveryBlocks.length).toBeGreaterThan(0);
    expect(recoveryBlocks[0].durationMinutes).toBe(10);
  });

  /**
   * Regression test for a real bug found by screen-recording a user session:
   * recovery blocks used to share one hardcoded taskId ("recovery-interval")
   * across every task. Once a task was marked complete, its work block
   * correctly disappeared from the UI (filtered by taskId status), but its
   * recovery block — tied to that shared fake id, which never has a
   * "completed" status — stayed on screen forever. Completing several Deep
   * Work tasks left a pile of orphaned "Cognitive Recovery" rows with no
   * task attached to them. Fix: each recovery block's taskId must match its
   * own parent task's id, so the two rise and fall together.
   */
  it("ties each recovery block's taskId to its own parent task, not a shared constant", () => {
    const tasks = [
      task({ id: "task-a", effortSize: "Standard" }), // 50 min -> triggers a recovery block
      task({ id: "task-b", effortSize: "Standard" }),
    ];
    const result = generateDailySchedule(tasks, 6, 8, 8, 0);
    const recoveryBlocks = result.blocks.filter((b) => b.type === "recovery");
    expect(recoveryBlocks.length).toBeGreaterThan(0);
    for (const rb of recoveryBlocks) {
      expect(rb.taskId).not.toBe("recovery-interval");
      // every recovery block's taskId must match some real task in the input
      expect(tasks.some((t) => t.id === rb.taskId)).toBe(true);
    }
  });

  it("sorts tasks by earliest deadline first, undated tasks last", () => {
    const tasks = [
      task({ id: "no-deadline", deadline: null }),
      task({ id: "later", deadline: "2026-12-01" }),
      task({ id: "sooner", deadline: "2026-10-01" }),
    ];
    const result = generateDailySchedule(tasks, 6, 8, 8, 0);
    const order = result.blocks.filter((b) => b.type === "work").map((b) => b.taskId);
    expect(order.indexOf("sooner")).toBeLessThan(order.indexOf("later"));
    expect(order.indexOf("later")).toBeLessThan(order.indexOf("no-deadline"));
  });
});
