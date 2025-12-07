import { loadConfig } from './config/configLoader';
import { SolanaClient } from './integrations/solanaClient';
import { JupiterClient } from './integrations/jupiterClient';
import { AxiomWatcher } from './integrations/axiomWatcher';
import { FeatureEngine } from './core/featureEngine';
import { RiskEngine } from './core/riskEngine';
import { PositionManager } from './core/positionManager';
import { LogManager } from './core/logManager';
import { TradeEngine } from './core/tradeEngine';
import { TelegramInterface } from './integrations/telegramBot';
import { LlmClient } from './integrations/llmClient';
import { AiEngine } from './core/aiEngine';
import { TokenState } from './utils/types';

const config = loadConfig();
const solanaClient = new SolanaClient(config);
const jupiterClient = new JupiterClient(solanaClient);
const axiomWatcher = new AxiomWatcher(solanaClient, config);
const featureEngine = new FeatureEngine();
const riskEngine = new RiskEngine();
const positionManager = new PositionManager();
const logManager = new LogManager();
const telegram = new TelegramInterface(config, axiomWatcher, positionManager, featureEngine);
const llmClient = new LlmClient(config);
const aiEngine = new AiEngine(riskEngine, llmClient, config);
const tradeEngine = new TradeEngine(
  config,
  featureEngine,
  riskEngine,
  positionManager,
  logManager,
  jupiterClient,
  solanaClient,
  telegram,
  config.aiAnalysisEnabled ? aiEngine : undefined,
);

let history: TokenState[] = [];

axiomWatcher.on('update', (state: TokenState) => {
  history = [...history, state].slice(-200);
});

const mainLoop = async () => {
  try {
    const tokens = axiomWatcher.getActiveTokens();
    for (const token of tokens) {
      await tradeEngine.processToken(token, history);
    }
  } catch (err: any) {
    telegram.sendMessage(`Erreur boucle principale: ${err.message}`);
  }
};

telegram.sendMessage(
  `Bot démarré en MODE ESSAI / SIMULATION – paperTrading = true, autoTrading = false, simulationEntrySizeEur = ${config.simulationEntrySizeEur}.`,
);

setInterval(mainLoop, config.refreshIntervalMs);
