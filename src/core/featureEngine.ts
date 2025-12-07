import { Features, FeatureContext, TokenState } from '../utils/types';

export class FeatureEngine {
  buildFeatures(tokenState: TokenState, context: FeatureContext): Features {
    const history = context.history.filter((h) => h.tokenMint === tokenState.tokenMint);
    const recent = history.slice(-5);
    const avgPrice =
      recent.reduce((acc, h) => acc + h.price, 0) / (recent.length || 1) || tokenState.price;
    const momentum = tokenState.price / (avgPrice || tokenState.price);

    const whaleDumpScore = tokenState.whaleDumpScore ?? 0;

    return {
      rugSupplyShare: tokenState.rugSupplyShare,
      rugSupplyDelta: tokenState.rugSupplyDelta,
      concentrationTop3: tokenState.concentrationTop3,
      liqToMcRatio: tokenState.liqToMcRatio,
      betaRugVolume: tokenState.betaRugVolume,
      ageSeconds: tokenState.ageSeconds,
      buySpeed: tokenState.buySpeed,
      flashPatternScore: tokenState.flashPatternScore,
      multiWalletScore: tokenState.multiWalletScore,
      momentum,
      buyVolume: tokenState.buyVolume,
      sellVolume: tokenState.sellVolume,
      whaleDumpScore,
    };
  }
}
