/**
 * Mastery math — pure, deterministic, Cairo-aware (§4.7).
 * masteryScore = round(weightedAccuracy * 100 * (0.4 + 0.6 * volumeConfidence))
 *   weightedAccuracy = Σ(w_i * correct_i) / Σ(w_i),   w_i = 0.92^i  (i=0 newest)
 *   volumeConfidence = min(1, n / 12)
 * Bands: 0–39 weak, 40–69 developing, 70–84 proficient, 85–100 mastered.
 */

export const MASTERY_DECAY = 0.92;
export const VOLUME_DENOM = 12;

export type MasteryInput = {
  /** Answers newest-first. */
  answers: Array<{ correct: boolean }>;
};

export type MasteryOutput = {
  masteryScore: number;
  band: "weak" | "developing" | "proficient" | "mastered";
  n: number;
  last10Accuracy: number;
};

export function computeMastery(input: MasteryInput): MasteryOutput {
  const { answers } = input;
  const n = answers.length;
  if (n === 0) {
    return { masteryScore: 0, band: "weak", n: 0, last10Accuracy: 0 };
  }

  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < n; i++) {
    const w = MASTERY_DECAY ** i;
    weightSum += w;
    if (answers[i].correct) weightedSum += w;
  }
  const weightedAccuracy = weightSum === 0 ? 0 : weightedSum / weightSum;
  const volumeConfidence = Math.min(1, n / VOLUME_DENOM);
  const masteryScore = Math.round(weightedAccuracy * 100 * (0.4 + 0.6 * volumeConfidence));

  const last10 = answers.slice(0, 10);
  const last10Accuracy = last10.length === 0 ? 0 : Math.round((last10.filter((a) => a.correct).length / last10.length) * 100);

  let band: MasteryOutput["band"] = "weak";
  if (masteryScore >= 85) band = "mastered";
  else if (masteryScore >= 70) band = "proficient";
  else if (masteryScore >= 40) band = "developing";

  return { masteryScore, band, n, last10Accuracy };
}