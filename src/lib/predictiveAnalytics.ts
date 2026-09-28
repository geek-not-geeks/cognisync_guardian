/**
 * predictiveAnalytics.ts
 *
 * This module is the actual empirical core of CogniSync Guardian: it takes
 * logged (confidence, completion, burnout context) observations and answers
 * two concrete questions with real statistics, not vibes:
 *
 *   1. Does self-reported task confidence actually predict completion?
 *      (Pearson correlation + a point-biserial-style check, since the
 *      outcome variable is binary)
 *   2. Can we do better than a naive guess by combining confidence with the
 *      burnout index at time of task creation? (logistic regression,
 *      implemented from scratch via gradient descent — no ML library,
 *      because the point is to be able to explain every step of it)
 *
 * Deliberately dependency-free: everything here is implementable and
 * defensible by hand, which matters far more for an application/interview
 * than importing scikit-learn-equivalent and calling .fit().
 *
 * IMPORTANT — methodological honesty:
 * This module does NOT prove the burnoutEngine.ts weights (35.0, 14.0, 6.5,
 * etc.) are correct. It gives you the tool to check whether they *should*
 * be trusted, once real data exists. Do not claim validation you haven't
 * run. See /analysis/README.md for the full methodology.
 */

export interface Observation {
  /** 1-5 self-rated confidence at task creation */
  confidence: number;
  /** whether the task was actually completed */
  completed: boolean;
  /** burnout index (0-100) at the time the task was created, if known */
  burnoutIndexAtCreation?: number;
}

export interface CorrelationResult {
  /** Pearson correlation coefficient between confidence and completion (0/1) */
  r: number;
  /** number of observations used */
  n: number;
  /** two-tailed p-value approximation via Student's t-distribution */
  pValue: number;
  /** plain-language interpretation, deliberately conservative */
  interpretation: string;
}

/**
 * Pearson correlation coefficient between confidence rating and completion
 * outcome (encoded 0/1). This is the "point-biserial correlation" special
 * case of Pearson's r when one variable is binary — mathematically
 * identical, so a plain Pearson implementation is correct and defensible.
 */
export function correlateConfidenceWithCompletion(
  observations: Observation[],
): CorrelationResult {
  const n = observations.length;
  if (n < 3) {
    return {
      r: 0,
      n,
      pValue: 1,
      interpretation:
        "Insufficient data (need at least 3 observations, ideally 30+) to compute a meaningful correlation.",
    };
  }

  const x = observations.map((o) => o.confidence);
  const y = observations.map((o) => (o.completed ? 1 : 0));

  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  const r = denominator === 0 ? 0 : numerator / denominator;

  // t-statistic for significance of r, df = n - 2
  const df = n - 2;
  const t = r * Math.sqrt(df / Math.max(1 - r * r, 1e-9));
  const pValue = twoTailedPFromT(Math.abs(t), df);

  let interpretation: string;
  const absR = Math.abs(r);
  if (n < 20) {
    interpretation = `n=${n} is too small to trust this correlation regardless of its value. Collect more data before drawing conclusions.`;
  } else if (pValue > 0.05) {
    interpretation = `Not statistically significant (p=${pValue.toFixed(3)}). Cannot claim confidence predicts completion with this dataset.`;
  } else if (absR < 0.2) {
    interpretation = `Statistically significant but weak (r=${r.toFixed(2)}). Confidence has some predictive value but is far from sufficient alone.`;
  } else if (absR < 0.5) {
    interpretation = `Moderate, statistically significant relationship (r=${r.toFixed(2)}, p=${pValue.toFixed(3)}).`;
  } else {
    interpretation = `Strong, statistically significant relationship (r=${r.toFixed(2)}, p=${pValue.toFixed(3)}).`;
  }

  return { r, n, pValue, interpretation };
}

export interface LogisticModel {
  /** learned weight on confidence */
  weightConfidence: number;
  /** learned weight on burnout index at creation (only present if provided in data) */
  weightBurnout: number;
  /** learned bias/intercept */
  bias: number;
  /** training loss curve (binary cross-entropy per epoch), for a convergence plot */
  lossHistory: number[];
  /** in-sample accuracy at a 0.5 decision threshold — report alongside a held-out number, never alone */
  trainAccuracy: number;
  predict: (confidence: number, burnoutIndex?: number) => number;
}

/**
 * Logistic regression fit via batch gradient descent, from first principles.
 * No external ML dependency — every line here is something you should be
 * able to derive on a whiteboard if asked.
 *
 * P(completed=1) = sigmoid(w1*confidence + w2*burnoutIndex + b)
 *
 * @param observations training data
 * @param epochs number of gradient descent iterations
 * @param learningRate step size
 */
export function trainCompletionModel(
  observations: Observation[],
  epochs = 2000,
  learningRate = 0.01,
): LogisticModel {
  const n = observations.length;
  const hasBurnout = observations.some((o) => o.burnoutIndexAtCreation !== undefined);

  // Feature scaling matters here: confidence is 1-5, burnout is 0-100.
  // Without normalizing, gradient descent on the raw scales converges
  // unevenly and the burnout weight will look artificially small.
  const confMax = 5;
  const burnoutMax = 100;

  let w1 = 0; // confidence weight
  let w2 = 0; // burnout weight
  let b = 0; // bias
  const lossHistory: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch++) {
    let gradW1 = 0;
    let gradW2 = 0;
    let gradB = 0;
    let loss = 0;

    for (const obs of observations) {
      const xConf = obs.confidence / confMax;
      const xBurnout = hasBurnout ? (obs.burnoutIndexAtCreation ?? 0) / burnoutMax : 0;
      const yTrue = obs.completed ? 1 : 0;

      const z = w1 * xConf + w2 * xBurnout + b;
      const yPred = sigmoid(z);
      const error = yPred - yTrue;

      gradW1 += error * xConf;
      gradW2 += error * xBurnout;
      gradB += error;

      // binary cross-entropy, clamped to avoid log(0)
      const p = Math.min(Math.max(yPred, 1e-9), 1 - 1e-9);
      loss += -(yTrue * Math.log(p) + (1 - yTrue) * Math.log(1 - p));
    }

    w1 -= (learningRate * gradW1) / n;
    w2 -= (learningRate * gradW2) / n;
    b -= (learningRate * gradB) / n;

    lossHistory.push(loss / n);
  }

  let correct = 0;
  for (const obs of observations) {
    const xConf = obs.confidence / confMax;
    const xBurnout = hasBurnout ? (obs.burnoutIndexAtCreation ?? 0) / burnoutMax : 0;
    const predicted = sigmoid(w1 * xConf + w2 * xBurnout + b) >= 0.5 ? 1 : 0;
    if (predicted === (obs.completed ? 1 : 0)) correct++;
  }

  const predict = (confidence: number, burnoutIndex?: number) => {
    const xConf = confidence / confMax;
    const xBurnout = hasBurnout ? (burnoutIndex ?? 0) / burnoutMax : 0;
    return sigmoid(w1 * xConf + w2 * xBurnout + b);
  };

  return {
    weightConfidence: w1,
    weightBurnout: w2,
    bias: b,
    lossHistory,
    trainAccuracy: correct / n,
    predict,
  };
}

/**
 * k-fold cross-validation accuracy — use THIS number, not trainAccuracy,
 * when reporting how good the model is. In-sample accuracy alone
 * overstates performance and is not something you want to say out loud
 * in an interview as your headline number.
 */
export function crossValidateAccuracy(
  observations: Observation[],
  k = 5,
  epochs = 2000,
  learningRate = 0.01,
): { meanAccuracy: number; foldAccuracies: number[] } {
  if (observations.length < k * 2) {
    return { meanAccuracy: NaN, foldAccuracies: [] };
  }

  const shuffled = [...observations].sort(() => Math.random() - 0.5);
  const foldSize = Math.floor(shuffled.length / k);
  const foldAccuracies: number[] = [];

  for (let i = 0; i < k; i++) {
    const testStart = i * foldSize;
    const testEnd = i === k - 1 ? shuffled.length : testStart + foldSize;
    const testSet = shuffled.slice(testStart, testEnd);
    const trainSet = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

    const model = trainCompletionModel(trainSet, epochs, learningRate);

    let correct = 0;
    for (const obs of testSet) {
      const predicted = model.predict(obs.confidence, obs.burnoutIndexAtCreation) >= 0.5 ? 1 : 0;
      if (predicted === (obs.completed ? 1 : 0)) correct++;
    }
    foldAccuracies.push(correct / testSet.length);
  }

  return {
    meanAccuracy: mean(foldAccuracies),
    foldAccuracies,
  };
}

// ---------------- internal helpers ----------------

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Approximate two-tailed p-value from a t-statistic using the
 * Abramowitz-Stegun approximation to the incomplete beta function.
 * Good enough for exploratory analysis; do not cite this to three
 * decimal places in a formal paper, but it is honest and derivable.
 */
function twoTailedPFromT(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  const p = incompleteBeta(x, df / 2, 0.5);
  return Math.min(Math.max(p, 0), 1);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt =
    Math.exp(
      logGamma(a + b) -
        logGamma(a) -
        logGamma(b) +
        a * Math.log(x) +
        b * Math.log(1 - x),
    );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const MAX_ITER = 100;
  const EPS = 3e-7;
  let m2, aa, c, d, del, h, qab, qam, qap;
  qab = a + b;
  qap = a + 1;
  qam = a - 1;
  c = 1;
  d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    m2 = 2 * m;
    aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of cof) {
    y += 1;
    ser += c / y;
  }
  return -tmp + Math.log((2.5066282746310007 * ser) / x);
}
