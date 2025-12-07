import { FeatureContext, Features, TokenState } from '../utils/types';
import { mean, safeDivide } from '../utils/mathUtils';

export class FeatureEngine {
  buildFeatures(tokenState: TokenState, context: FeatureContext): Features {
    const momentum = this.computeMomentum(tokenState.price, context.recentPrices);
    return {
      tokenMint: tokenState.tokenMint,
      price: tokenState.price,
      liquidity: tokenState.liquidity,
      marketCap: tokenState.marketCap,
      rugSupplyShare: tokenState.rugSupplyShare,
      rugSupplyDelta: tokenState.rugSupplyDelta,
      concentrationTop3: tokenState.concentrationTop3,
      liqToMcRatio: tokenState.liqToMcRatio,
      betaRugVolume: tokenState.betaRugVolume,
      ageSeconds: tokenState.ageSeconds,
      buySpeed: tokenState.buySpeed,
      flashPatternScore: tokenState.flashPatternScore,
      multiWalletScore: tokenState.multiWalletScore,
      buyVolume: tokenState.buyVolume,
      sellVolume: tokenState.sellVolume,
      momentum,
    };
  }

  private computeMomentum(latestPrice: number, recent: number[]): number {
    if (!recent.length) return 1;
    const avg = mean(recent);
    return safeDivide(latestPrice, avg || 1);
  }
}
