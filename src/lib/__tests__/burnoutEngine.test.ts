import { describe, it, expect } from "vitest";
import { calculateBurnoutTier } from "../burnoutEngine";

describe("calculateBurnoutTier", () => {
  it("returns sustainable when sleep, energy, and workload are all healthy", () => {
    const result = calculateBurnoutTier([4, 4, 4, 4], [7, 7, 7, 7], 7, 240, 360);
    expect(result.tier).toBe("sustainable");
    expect(result.capacityMultiplier).toBe(1.0);
    expect(result.actionTaken).toBeNull();
    // (240/360) / (7/8) * 35 = 26.67, rounds to 27
    expect(result.score).toBe(27);
  });

  it("enters amber tier once trailing sleep average drops below 6h, even with fine 'today' numbers", () => {
    const result = calculateBurnoutTier([4, 4, 4, 4], [5, 5, 5, 5], 7, 240, 360);
    expect(result.tier).toBe("amber");
    expect(result.actionTaken).toMatch(/48h/);
  });

  it("forces red tier when clamped score crosses 75, and floors the reported score at 80", () => {
    const result = calculateBurnoutTier([4, 4, 4, 4], [4, 4, 4, 4], 5, 360, 360);
    expect(result.tier).toBe("red");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.capacityMultiplier).toBe(0.5);
  });

  it("forces red tier from a single very low latest-night sleep reading, even if the composite score is moderate", () => {
    // avg sleep is fine (7h), only last night was bad (4h) - this is the
    // "acute crash" case the OR-condition is specifically meant to catch.
    const result = calculateBurnoutTier([8, 8, 8, 4], [8, 8, 8, 4], 8, 100, 360);
    expect(result.tier).toBe("red");
    // sanity check this genuinely is the "OR" branch firing, not the score
    // threshold - the exact index computed should be well under 75.
    expect(result.exactIndex).toBeLessThan(75);
  });

  it("forces red tier from critically low energy alone (<=2), regardless of sleep", () => {
    const result = calculateBurnoutTier([4, 4, 4, 4], [8, 8, 8, 8], 2, 100, 360);
    expect(result.tier).toBe("red");
  });

  it("clamps the integer score to the documented [2, 98] range even under extreme inputs", () => {
    const extreme = calculateBurnoutTier([0, 0, 0, 0], [0, 0, 0, 0], 0, 1000, 100);
    expect(extreme.score).toBeLessThanOrEqual(98);
    expect(extreme.score).toBeGreaterThanOrEqual(2);
  });

  it("workloadRatio is clamped at 1.5 even for wildly over-scheduled days", () => {
    const capped = calculateBurnoutTier([4, 4, 4, 4], [7, 7, 7, 7], 7, 10000, 360);
    const uncapped = calculateBurnoutTier([4, 4, 4, 4], [7, 7, 7, 7], 7, 540, 360); // exactly ratio 1.5
    expect(capped.exactIndex).toBeCloseTo(uncapped.exactIndex, 1);
  });

  /**
   * KNOWN BUG, documented not silently fixed: `trailingStudyHoursLast4Days`
   * is accepted as the function's first parameter and named as though it
   * feeds the workload-density calculation, but it is never read anywhere
   * in the function body. Only `todayWorkloadMinutes` (a single day) drives
   * the workload side of the ratio. This test pins that behavior down so
   * it can't regress silently, and exists as a flag that this parameter
   * should either be wired in properly or removed from the signature -
   * right now it's dead weight that misleads anyone reading the call site.
   */
  it("BUG: trailingStudyHoursLast4Days has zero effect on the output (dead parameter)", () => {
    const a = calculateBurnoutTier([1, 1, 1, 1], [7, 7, 7, 7], 7, 240, 360);
    const b = calculateBurnoutTier([20, 20, 20, 20], [7, 7, 7, 7], 7, 240, 360);
    expect(a).toEqual(b);
  });
});
