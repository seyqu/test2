import dotenv from 'dotenv';
import { Config, RiskCoefficients } from '../utils/types';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return value === 'true' || value === '1';
};

const defaultRiskCoefficients: RiskCoefficients = {
  a0: -2.0,
  a1: 2.5,
  a2: 1.5,
  a3: 2.0,
  a4: 1.2,
  a5: 1.8,
  a6: 1.0,
  a7: 0.8,
  a8: 1.5,
  a9: 1.5,
};

export const loadConfig = (): Config => {
  return {
    rpcUrl: process.env.RPC_URL || 'https://rpc.ankr.com/solana',
    wsUrl: process.env.WS_URL || 'wss://rpc.ankr.com/solana/ws',
    privateKey: process.env.PRIVATE_KEY,
    heliusApiKey: process.env.HELIUS_API_KEY,
    paperTrading: parseBoolean(process.env.PAPER_TRADING, true),
    autoTrading: parseBoolean(process.env.AUTO_TRADING, false),
    simulationEntrySizeEur: parseNumber(process.env.SIM_ENTRY_EUR, 20),
    tradeSizeNormal: parseNumber(process.env.TRADE_SIZE_NORMAL, 0.2),
    tradeSizeMicro: parseNumber(process.env.TRADE_SIZE_MICRO, 0.05),
    profitTarget: parseNumber(process.env.PROFIT_TARGET, 0.05),
    lossEstimate: parseNumber(process.env.LOSS_ESTIMATE, 0.2),
    minLiquidity: parseNumber(process.env.MIN_LIQUIDITY, 10000),
    minMarketCap: parseNumber(process.env.MIN_MARKET_CAP, 20000),
    refreshIntervalMs: parseNumber(process.env.REFRESH_INTERVAL_MS, 300),
    aiAnalysisEnabled: parseBoolean(process.env.AI_ANALYSIS_ENABLED, false),
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    riskCoefficients: {
      a0: parseNumber(process.env.RISK_A0, defaultRiskCoefficients.a0),
      a1: parseNumber(process.env.RISK_A1, defaultRiskCoefficients.a1),
      a2: parseNumber(process.env.RISK_A2, defaultRiskCoefficients.a2),
      a3: parseNumber(process.env.RISK_A3, defaultRiskCoefficients.a3),
      a4: parseNumber(process.env.RISK_A4, defaultRiskCoefficients.a4),
      a5: parseNumber(process.env.RISK_A5, defaultRiskCoefficients.a5),
      a6: parseNumber(process.env.RISK_A6, defaultRiskCoefficients.a6),
      a7: parseNumber(process.env.RISK_A7, defaultRiskCoefficients.a7),
      a8: parseNumber(process.env.RISK_A8, defaultRiskCoefficients.a8),
      a9: parseNumber(process.env.RISK_A9, defaultRiskCoefficients.a9),
    },
    ruggerWallets: (process.env.RUGGER_WALLETS || '')
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0),
    focusTokenMint: process.env.FOCUS_TOKEN_MINT,
    whaleSellThreshold: parseNumber(process.env.WHALE_SELL_THRESHOLD, 0.02),
    whaleWindowSeconds: parseNumber(process.env.WHALE_WINDOW_SECONDS, 10),
    whaleDumpScoreThreshold: parseNumber(process.env.WHALE_DUMP_SCORE_THRESHOLD, 3),
  };
};
