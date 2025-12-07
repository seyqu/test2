import { JupiterClient } from '../integrations/jupiterClient';
import { SolanaClient } from '../integrations/solanaClient';
import { AxiomWatcher } from '../integrations/axiomWatcher';
import { FeatureEngine } from './featureEngine';
import { RiskEngine } from './riskEngine';
import { PositionManager } from './positionManager';
import { LogManager } from './logManager';
import { DataFeed } from './dataFeed';
import { Config, Features, Position, TokenState } from '../utils/types';
import { logger } from '../utils/logger';

export class TradeEngine {
  constructor(
    private config: Config,
    private axiomWatcher: AxiomWatcher,
    private featureEngine: FeatureEngine,
    private riskEngine: RiskEngine,
    private positionManager: PositionManager,
    private logManager: LogManager,
    private dataFeed: DataFeed,
    private solanaClient: SolanaClient,
    private jupiterClient: JupiterClient
  ) {}

  evaluateEntries(): void {
    const tokens = this.axiomWatcher.getActiveTokens();
    tokens.forEach((token) => this.dataFeed.pushState(token));

    for (const token of tokens) {
      const existing = this.positionManager.getOpenPositions().find((p) => p.tokenMint === token.tokenMint);
      const features = this.featureEngine.buildFeatures(token, {
        recentPrices: this.dataFeed.getRecentPrices(token.tokenMint),
        ruggerWallets: this.config.ruggers,
      });
      const pRug = this.riskEngine.computeRugProbability(features, this.config);
      const pMax = this.config.profitTarget / (this.config.profitTarget + this.config.lossEstimate);
      const expectedValue = (1 - pRug) * this.config.profitTarget - pRug * this.config.lossEstimate;
      const momentumOk = features.momentum > 1.5;
      if (!existing && expectedValue > 0 && token.liquidity >= this.config.minLiquidity && token.marketCap >= this.config.minMarketCap && pRug < pMax && momentumOk) {
        const sizeSol = pRug < 0.5 * pMax ? this.config.tradeSizeNormal : this.config.tradeSizeMicro;
        this.enterPosition(token, features, sizeSol, pRug);
      }
    }
  }

  evaluateExits(): void {
    const positions = this.positionManager.getOpenPositions();
    for (const pos of positions) {
      const token = this.axiomWatcher.getActiveTokens().find((t) => t.tokenMint === pos.tokenMint);
      if (!token) continue;
      const features = this.featureEngine.buildFeatures(token, {
        recentPrices: this.dataFeed.getRecentPrices(token.tokenMint),
        ruggerWallets: this.config.ruggers,
      });
      const pRug = this.riskEngine.computeRugProbability(features, this.config);
      const pMax = this.config.profitTarget / (this.config.profitTarget + this.config.lossEstimate);
      const pnl = (token.price - pos.entryPrice) / pos.entryPrice;
      let exitReason: string | null = null;
      if (pnl >= this.config.profitTarget) exitReason = 'TP';
      else if (pRug >= pMax) exitReason = 'RUG_RISK';
      else if (features.momentum <= 1.0) exitReason = 'MOMENTUM';

      if (exitReason) {
        this.exitPosition(pos, token, features, pRug, exitReason);
      }
    }
  }

  private async enterPosition(token: TokenState, features: Features, sizeSol: number, pRug: number) {
    const position: Position = {
      tokenMint: token.tokenMint,
      entryPrice: token.price,
      entryTime: Date.now(),
      sizeSol,
      sizeTokens: sizeSol / (token.price || 1),
      autoMode: this.config.autoTrading,
      pRugEntry: pRug,
    };

    if (this.config.paperTrading) {
      this.positionManager.openPosition(position);
      logger.info(`Paper entry ${token.tokenMint} size ${sizeSol} SOL pRug=${pRug.toFixed(3)}`);
    } else {
      try {
        const tx = await this.jupiterClient.buildSwapTxSolToToken(token.tokenMint, sizeSol * 1e9);
        const sig = await this.solanaClient.sendTransaction(tx);
        logger.info(`Live entry tx signature ${sig}`);
        this.positionManager.openPosition(position);
      } catch (err) {
        logger.error(`Failed to enter position live: ${err}`);
      }
    }
  }

  private async exitPosition(position: Position, token: TokenState, features: Features, pRug: number, reason: string) {
    const closed = this.positionManager.closePosition(position.tokenMint, token.price, reason, pRug);
    if (!closed) return;
    if (this.config.paperTrading) {
      this.logManager.appendTrade(closed, token.price, reason, pRug, features);
    } else {
      try {
        const tx = await this.jupiterClient.buildSwapTxTokenToSol(position.tokenMint, position.sizeTokens * 10 ** 6);
        const sig = await this.solanaClient.sendTransaction(tx);
        logger.info(`Live exit tx signature ${sig}`);
        this.logManager.appendTrade(closed, token.price, reason, pRug, features);
      } catch (err) {
        logger.error(`Failed to exit position live: ${err}`);
      }
    }
  }
}
