import { Transaction } from '@solana/web3.js';

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
  privateKey?: string;
  heliusApiKey?: string;
  paperTrading: boolean;
  autoTrading: boolean;
  simulationEntrySizeEur: number;
  tradeSizeNormal: number;
  tradeSizeMicro: number;
  profitTarget: number;
  lossEstimate: number;
  minLiquidity: number;
  minMarketCap: number;
  refreshIntervalMs: number;
  aiAnalysisEnabled: boolean;
  openAiApiKey?: string;
  openAiModel?: string;
  riskCoefficients: RiskCoefficients;
  ruggerWallets: string[];
  focusTokenMint?: string;
  whaleSellThreshold: number;
  whaleWindowSeconds: number;
  whaleDumpScoreThreshold: number;
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
  holders?: number;
  whaleSellVolumeWindow?: number;
  whaleSellCountWindow?: number;
  whaleDumpScore?: number;
}

export interface FeatureContext {
  history: TokenState[];
  now: number;
}

export interface Features {
  rugSupplyShare: number;
  rugSupplyDelta: number;
  concentrationTop3: number;
  liqToMcRatio: number;
  betaRugVolume: number;
  ageSeconds: number;
  buySpeed: number;
  flashPatternScore: number;
  multiWalletScore: number;
  momentum: number;
  buyVolume: number;
  sellVolume: number;
  whaleDumpScore: number;
}

export interface Position {
  tokenMint: string;
  entryPrice: number;
  entryTime: number;
  sizeSol: number;
  sizeTokens: number;
  autoMode: boolean;
  pRugEntry: number;
  simulation: boolean;
}

export interface TradeExitLog {
  tokenMint: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  pnlSol: number;
  exitReason: string;
  liquidity: number;
  marketCap: number;
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
  pRugEntry: number;
  pRugExit: number;
  simulation: boolean;
  whaleDumpScore: number;
}

export interface SwapClient {
  buildSwapTxSolToToken(tokenMint: string, amountLamports: number): Promise<Transaction>;
  buildSwapTxTokenToSol(tokenMint: string, amountTokens: number): Promise<Transaction>;
}

export interface SolanaClientLike {
  getWalletTokenBalance(mint: string): Promise<number>;
  getTokenInfo(mint: string): Promise<{ decimals: number; supply: number }>;
  sendTransaction(tx: Transaction): Promise<string>;
  subscribeLogs(filter: any, callback: (log: any) => void): () => void;
}

export interface AiAnalysisResult {
  pRug: number;
  explanation: string;
}
