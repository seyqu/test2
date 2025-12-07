import { FeatureEngine } from './featureEngine';
import { RiskEngine } from './riskEngine';
import { PositionManager } from './positionManager';
import { LogManager } from './logManager';
import { JupiterClient } from '../integrations/jupiterClient';
import { SolanaClient } from '../integrations/solanaClient';
import { Config, TokenState, Features } from '../utils/types';
import { TelegramInterface } from '../integrations/telegramBot';
import { AiEngine } from './aiEngine';

export class TradeEngine {
  constructor(
    private config: Config,
    private featureEngine: FeatureEngine,
    private riskEngine: RiskEngine,
    private positionManager: PositionManager,
    private logManager: LogManager,
    private jupiterClient: JupiterClient,
    private solanaClient: SolanaClient,
    private telegram: TelegramInterface,
    private aiEngine?: AiEngine,
  ) {}

  async processToken(token: TokenState, history: TokenState[]) {
    const context = { history, now: Date.now() };
    const features = this.featureEngine.buildFeatures(token, context);
    let pRug = this.riskEngine.computeRugProbability(features, this.config);
    const aiResult = this.aiEngine
      ? await this.aiEngine.getAiAugmentedAnalysis(token, features, pRug, this.getPosition(token.tokenMint))
      : { pRug, explanation: '' };
    pRug = aiResult.pRug;

    const pMax = this.config.profitTarget / (this.config.profitTarget + this.config.lossEstimate);
    const expectedGain = (1 - pRug) * this.config.profitTarget - pRug * this.config.lossEstimate;

    const position = this.getPosition(token.tokenMint);
    if (position) {
      await this.handleExit(token, position, features, pRug, pMax);
      return;
    }

    if (token.liquidity < this.config.minLiquidity || token.marketCap < this.config.minMarketCap) return;
    if (pRug >= pMax) return;
    if (features.momentum <= 1.5) return;
    if (expectedGain <= 0) return;

    if (!this.config.autoTrading) {
      this.telegram.notifySignal(token, `p_rug ${(pRug * 100).toFixed(2)}%, momentum ${features.momentum.toFixed(2)}`);
      return;
    }

    if (this.config.paperTrading) {
      this.enterSimulation(token, pRug);
    } else {
      await this.enterLive(token, pRug);
    }
  }

  private getPosition(tokenMint: string) {
    return this.positionManager.getOpenPositions().find((p) => p.tokenMint === tokenMint) || null;
  }

  private enterSimulation(token: TokenState, pRug: number) {
    const sizeSol = this.config.simulationEntrySizeEur / 150;
    const sizeTokens = sizeSol / Math.max(token.price, 0.0000001);
    const position = {
      tokenMint: token.tokenMint,
      entryPrice: token.price,
      entryTime: Date.now(),
      sizeSol,
      sizeTokens,
      autoMode: true,
      pRugEntry: pRug,
      simulation: true,
    };
    this.positionManager.openPosition(position);
    this.telegram.notifyEntry(position);
  }

  private async enterLive(token: TokenState, pRug: number) {
    try {
      const pMax = this.config.profitTarget / (this.config.profitTarget + this.config.lossEstimate);
      const sizeSol = pRug < 0.5 * pMax ? this.config.tradeSizeNormal : this.config.tradeSizeMicro;
      const amountLamports = Math.floor(sizeSol * 1e9);
      const tx = await this.jupiterClient.buildSwapTxSolToToken(token.tokenMint, amountLamports);
      await this.solanaClient.sendTransaction(tx);
      const position = {
        tokenMint: token.tokenMint,
        entryPrice: token.price,
        entryTime: Date.now(),
        sizeSol,
        sizeTokens: sizeSol / Math.max(token.price, 0.0000001),
        autoMode: true,
        pRugEntry: pRug,
        simulation: false,
      };
      this.positionManager.openPosition(position);
      this.telegram.notifyEntry(position);
    } catch (err: any) {
      this.telegram.sendMessage(`Erreur entrée live: ${err.message}`);
    }
  }

  private async handleExit(
    token: TokenState,
    position: any,
    features: Features,
    pRug: number,
    pMax: number,
  ) {
    const pnlPercent = (token.price - position.entryPrice) / position.entryPrice;
    const exitPrice = token.price;
    let reason: string | null = null;

    if (pnlPercent >= this.config.profitTarget) reason = 'TP';
    if (pRug >= pMax) reason = reason || 'RUG_RISK';
    if (features.momentum <= 1.0) reason = reason || 'MOMENTUM';
    if (this.riskEngine.computeWhaleRugSpike(features, this.config)) reason = 'RUG_EMERGENCY_EXIT';

    if (!reason) return;

    if (this.config.paperTrading) {
      this.finalizeExit(position, token, exitPrice, pnlPercent, reason, pRug);
    } else {
      try {
        const tx = await this.jupiterClient.buildSwapTxTokenToSol(token.tokenMint, Math.floor(position.sizeTokens * 10 ** 6));
        await this.solanaClient.sendTransaction(tx);
        this.finalizeExit(position, token, exitPrice, pnlPercent, reason, pRug);
      } catch (err: any) {
        this.telegram.sendMessage(`Erreur sortie live: ${err.message}`);
      }
    }
  }

  private finalizeExit(position: any, token: TokenState, exitPrice: number, pnlPercent: number, reason: string, pRugExit: number) {
    this.positionManager.closePosition(position.tokenMint, exitPrice, reason, pRugExit);
    this.telegram.notifyExit(position.tokenMint, reason, pnlPercent);
    const logPayload = {
      tokenMint: position.tokenMint,
      entryTime: position.entryTime,
      exitTime: Date.now(),
      entryPrice: position.entryPrice,
      exitPrice,
      pnlPercent,
      pnlSol: position.sizeSol * pnlPercent,
      exitReason: reason,
      liquidity: token.liquidity,
      marketCap: token.marketCap,
      rugSupplyShare: token.rugSupplyShare,
      rugSupplyDelta: token.rugSupplyDelta,
      concentrationTop3: token.concentrationTop3,
      liqToMcRatio: token.liqToMcRatio,
      betaRugVolume: token.betaRugVolume,
      buyVolume: token.buyVolume,
      sellVolume: token.sellVolume,
      buySpeed: token.buySpeed,
      flashPatternScore: token.flashPatternScore,
      multiWalletScore: token.multiWalletScore,
      pRugEntry: position.pRugEntry,
      pRugExit,
      simulation: position.simulation,
      whaleDumpScore: token.whaleDumpScore ?? 0,
    };
    this.logManager.logTrade(logPayload);
  }
}
