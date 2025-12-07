import { Connection } from '@solana/web3.js';

export interface RiskCoefficients {
  a0: number;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  a7: number;
  a8: number;
  a9: number;
}

export interface Config {
  rpcUrl: string;
  wsUrl: string;
  privateKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  profitTarget: number;
  lossEstimate: number;
  tradeSizeNormal: number;
  tradeSizeMicro: number;
  maxDailyLossPercent: number;
  maxPositions: number;
  refreshIntervalMs: number;
  riskCoefficients: RiskCoefficients;
  minLiquidity: number;
  minMarketCap: number;
  slippageBps: number;
  priorityFeeMicroLamports: number;
  paperTrading: boolean;
  autoTrading: boolean;
  ruggers: string[];
  openAiApiKey: string;
  openAiModel: string;
  aiAnalysisEnabled: boolean;
}

export interface TokenState {
  tokenMint: string;
  poolAddress: string;
  price: number;
  liquidity: number;
  marketCap: number;
  ageSeconds: number;
  rugSupplyShare: number;
  rugSupplyDelta: number;
  concentrationTop3: number;
  liqToMcRatio: number;
  betaRugVolume: number;
  buyVolume: number;
  sellVolume: number;
  buySpeed: number;
  flashPatternScore: number;
  multiWalletScore: number;
  lastUpdated: number;
}

export interface FeatureContext {
  recentPrices: number[];
  ruggerWallets: string[];
}

export interface Features {
  tokenMint: string;
  price: number;
  liquidity: number;
  marketCap: number;
  rugSupplyShare: number;
  rugSupplyDelta: number;
  concentrationTop3: number;
  liqToMcRatio: number;
  betaRugVolume: number;
  ageSeconds: number;
  buySpeed: number;
  flashPatternScore: number;
  multiWalletScore: number;
  buyVolume: number;
  sellVolume: number;
  momentum: number;
}

export interface Position {
  tokenMint: string;
  entryPrice: number;
  entryTime: number;
  sizeSol: number;
  sizeTokens: number;
  autoMode: boolean;
  pRugEntry: number;
}

export interface CloseEvent {
  tokenMint: string;
  exitPrice: number;
  exitReason: string;
  pRugExit: number;
}

export interface SolanaClients {
  connection: Connection;
  wsConnection: Connection;
}

export interface AiAnalysisResult {
  pRug: number;
  explanation: string;
}
