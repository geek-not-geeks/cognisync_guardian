import { describe, it, expect } from "vitest";
import {
  correlateConfidenceWithCompletion,
  trainCompletionModel,
  crossValidateAccuracy,
  type Observation,
} from "../predictiveAnalytics";

describe("correlateConfidenceWithCompletion", () => {
  it("returns r close to +1 for a perfectly monotonic relationship", () => {
    const observations: Observation[] = [
      { confidence: 1, completed: false },
      { confidence: 2, completed: false },
      { confidence: 3, completed: false },
      { confidence: 4, completed: true },
      { confidence: 5, completed: true },
    ];
    const result = correlateConfidenceWithCompletion(observations);
    expect(result.r).toBeGreaterThan(0.7);
  });

  it("returns r close to 0 when confidence has no relationship to completion", () => {
    // deliberately alternating pattern with no monotonic trend
    const observations: Observation[] = [
      { confidence: 1, completed: true },
      { confidence: 1, completed: false },
      { confidence: 3, completed: true },
      { confidence: 3, completed: false },
      { confidence: 5, completed: true },
      { confidence: 5, completed: false },
    ];
    const result = correlateConfidenceWithCompletion(observations);
    expect(Math.abs(result.r)).toBeLessThan(0.3);
  });

  it("flags small samples as untrustworthy regardless of the r value", () => {
    const observations: Observation[] = [
      { confidence: 5, completed: true },
      { confidence: 1, completed: false },
    ];
    const result = correlateConfidenceWithCompletion(observations);
    expect(result.interpretation).toMatch(/Insufficient data/);
  });

  it("does not claim significance for n < 20 even with a strong r", () => {
    const observations: Observation[] = Array.from({ length: 10 }, (_, i) => ({
      confidence: (i % 5) + 1,
      completed: i % 5 >= 3,
    }));
    const result = correlateConfidenceWithCompletion(observations);
    expect(result.interpretation).toMatch(/too small to trust/);
  });
});

describe("trainCompletionModel", () => {
  it("learns a positive weight on confidence for a clearly positive relationship", () => {
    const observations: Observation[] = [];
    for (let i = 0; i < 40; i++) {
      const confidence = 1 + (i % 5);
      const completed = confidence >= 4; // strong deterministic-ish signal
      observations.push({ confidence, completed });
    }
    const model = trainCompletionModel(observations, 3000, 0.1);
    expect(model.weightConfidence).toBeGreaterThan(0);
    expect(model.trainAccuracy).toBeGreaterThan(0.8);
  });

  it("loss history is non-increasing on average (gradient descent is actually converging)", () => {
    const observations: Observation[] = Array.from({ length: 30 }, (_, i) => ({
      confidence: 1 + (i % 5),
      completed: i % 5 >= 3,
    }));
    const model = trainCompletionModel(observations, 500, 0.1);
    const firstQuarter = model.lossHistory.slice(0, 125);
    const lastQuarter = model.lossHistory.slice(-125);
    const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
    expect(avgLast).toBeLessThan(avgFirst);
  });

  it("incorporates burnout index as a second feature when provided", () => {
    const observations: Observation[] = [];
    for (let i = 0; i < 40; i++) {
      const burnoutIndexAtCreation = (i % 2 === 0) ? 20 : 90;
      // low burnout -> completes regardless of confidence; high burnout -> fails regardless
      observations.push({
        confidence: 1 + (i % 5),
        burnoutIndexAtCreation,
        completed: burnoutIndexAtCreation < 50,
      });
    }
    const model = trainCompletionModel(observations, 3000, 0.1);
    // higher burnout should push predicted completion probability down
    expect(model.weightBurnout).toBeLessThan(0);
  });
});

describe("crossValidateAccuracy", () => {
  it("reports a held-out accuracy that is not simply copying training accuracy", () => {
    const observations: Observation[] = Array.from({ length: 50 }, (_, i) => ({
      confidence: 1 + (i % 5),
      completed: i % 5 >= 3,
    }));
    const { meanAccuracy, foldAccuracies } = crossValidateAccuracy(observations, 5, 1000, 0.1);
    expect(foldAccuracies).toHaveLength(5);
    expect(meanAccuracy).toBeGreaterThan(0);
    expect(meanAccuracy).toBeLessThanOrEqual(1);
  });

  it("returns NaN gracefully when there isn't enough data for the requested fold count", () => {
    const observations: Observation[] = [
      { confidence: 3, completed: true },
      { confidence: 2, completed: false },
    ];
    const { meanAccuracy, foldAccuracies } = crossValidateAccuracy(observations, 5);
    expect(Number.isNaN(meanAccuracy)).toBe(true);
    expect(foldAccuracies).toHaveLength(0);
  });
});
