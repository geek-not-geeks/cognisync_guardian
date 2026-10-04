import {
  correlateConfidenceWithCompletion,
  trainCompletionModel,
  type Observation,
} from "@/lib/predictiveAnalytics";

/**
 * This is the piece that makes the "does my plan actually match what I
 * complete" thesis real and visible, instead of a claim with nothing behind
 * it. It does NOT call any external AI API — correlation and logistic
 * regression on a few dozen numbers don't need one. It's plain statistics,
 * run on your own logged data, in your own browser.
 *
 * Deliberately conservative: below MIN_SAMPLE_SIZE observations, this
 * refuses to claim a personalized pattern exists at all, and the UI must
 * say so plainly rather than show a number that doesn't mean anything yet.
 */

export const MIN_SAMPLE_SIZE = 10;

export type PersonalizationInsight =
  | {
      status: "cold-start";
      observationsLogged: number;
      observationsNeeded: number;
    }
  | {
      status: "active";
      observationsLogged: number;
      correlationR: number;
      pValue: number;
      interpretation: string;
      trainAccuracy: number;
      predict: (confidence: number, burnoutIndex?: number) => number;
    };

export function computePersonalizationInsight(
  observations: Observation[],
): PersonalizationInsight {
  const n = observations.length;

  if (n < MIN_SAMPLE_SIZE) {
    return {
      status: "cold-start",
      observationsLogged: n,
      observationsNeeded: MIN_SAMPLE_SIZE,
    };
  }

  const correlation = correlateConfidenceWithCompletion(observations);
  const model = trainCompletionModel(observations);

  return {
    status: "active",
    observationsLogged: n,
    correlationR: correlation.r,
    pValue: correlation.pValue,
    interpretation: correlation.interpretation,
    trainAccuracy: model.trainAccuracy,
    predict: model.predict,
  };
}
