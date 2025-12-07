import { Config, Features } from '../utils/types';

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export class RiskEngine {
  computeRugProbability(features: Features, config: Config): number {
    const a = config.riskCoefficients;
    const score =
      a.a0 +
      a.a1 * features.rugSupplyShare +
      a.a2 * features.rugSupplyDelta +
      a.a3 * features.concentrationTop3 +
      a.a4 * (1 / (features.liqToMcRatio + 0.0001)) +
      a.a5 * features.betaRugVolume +
      a.a6 * (1 / (features.ageSeconds + 1)) +
      a.a7 * features.buySpeed +
      a.a8 * features.flashPatternScore +
      a.a9 * features.multiWalletScore;

    const base = sigmoid(score);
    const adjusted = Math.min(1, Math.max(0, base + (features.whaleDumpScore || 0) * 0.01));
    return adjusted;
  }

  computeWhaleRugSpike(features: Features, config: Config): boolean {
    const threshold = config.whaleDumpScoreThreshold || 3;
    return features.whaleDumpScore >= threshold;
  }
}
