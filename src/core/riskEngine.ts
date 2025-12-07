import { Config, Features } from '../utils/types';
import { sigmoid } from '../utils/mathUtils';

export class RiskEngine {
  computeRugProbability(features: Features, config: Config): number {
    const c = config.riskCoefficients;
    const score =
      c.a0 +
      c.a1 * features.rugSupplyShare +
      c.a2 * features.rugSupplyDelta +
      c.a3 * features.concentrationTop3 +
      c.a4 * (1 / (features.liqToMcRatio + 0.0001)) +
      c.a5 * features.betaRugVolume +
      c.a6 * (1 / (features.ageSeconds + 1)) +
      c.a7 * features.buySpeed +
      c.a8 * features.flashPatternScore +
      c.a9 * features.multiWalletScore;
    return sigmoid(score);
  }
}
