import dotenv from 'dotenv';
import { loadConfig } from './config/configLoader';
import { SolanaClient } from './integrations/solanaClient';
import { AxiomWatcher } from './integrations/axiomWatcher';
import { JupiterClient } from './integrations/jupiterClient';
import { TelegramBotClient } from './integrations/telegramBot';
import { FeatureEngine } from './core/featureEngine';
import { RiskEngine } from './core/riskEngine';
import { PositionManager } from './core/positionManager';
import { LogManager } from './core/logManager';
import { DataFeed } from './core/dataFeed';
import { TradeEngine } from './core/tradeEngine';
import { LlmClient } from './integrations/llmClient';
import { AiEngine } from './core/aiEngine';
import { logger } from './utils/logger';

dotenv.config();

async function main() {
  const config = loadConfig();
  let runtimeConfig = { ...config };
  const solanaClient = new SolanaClient(runtimeConfig);
  const axiomWatcher = new AxiomWatcher();
  const jupiterClient = new JupiterClient(runtimeConfig);
  const featureEngine = new FeatureEngine();
  const riskEngine = new RiskEngine();
  const positionManager = new PositionManager();
  const logManager = new LogManager();
  const dataFeed = new DataFeed();
  const llmClient = runtimeConfig.aiAnalysisEnabled ? new LlmClient(runtimeConfig) : null;
  const aiEngine = new AiEngine(riskEngine, llmClient, runtimeConfig);
  const tradeEngine = new TradeEngine(
    runtimeConfig,
    axiomWatcher,
    featureEngine,
    riskEngine,
    positionManager,
    logManager,
    dataFeed,
    solanaClient,
    jupiterClient
  );

  const telegramBot = new TelegramBotClient(
    runtimeConfig,
    () => positionManager.getOpenPositions(),
    (partial) => {
      runtimeConfig = { ...runtimeConfig, ...partial };
    }
  );

  axiomWatcher.start();

  setInterval(async () => {
    try {
      tradeEngine.evaluateEntries();
      tradeEngine.evaluateExits();

      for (const token of axiomWatcher.getActiveTokens()) {
        const features = featureEngine.buildFeatures(token, {
          recentPrices: dataFeed.getRecentPrices(token.tokenMint),
          ruggerWallets: runtimeConfig.ruggers,
        });
        const ai = await aiEngine.getAiAugmentedAnalysis(token, features, null);
        telegramBot.notify(
          `Token ${token.tokenMint} pRug=${ai.pRug.toFixed(3)} price=${token.price} liquidity=${token.liquidity}\n${ai.explanation}`
        );
      }
    } catch (err) {
      logger.error(`Main loop error: ${err}`);
    }
  }, runtimeConfig.refreshIntervalMs);
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
});
