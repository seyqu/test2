import fs from 'fs';
import path from 'path';
import { Config } from '../utils/types';

const REQUIRED_FIELDS: (keyof Config)[] = [
  'rpcUrl',
  'wsUrl',
  'privateKey',
  'profitTarget',
  'lossEstimate',
  'tradeSizeNormal',
  'tradeSizeMicro',
  'maxDailyLossPercent',
  'maxPositions',
  'refreshIntervalMs',
  'riskCoefficients',
  'minLiquidity',
  'minMarketCap',
  'slippageBps',
  'priorityFeeMicroLamports',
  'paperTrading',
  'autoTrading',
  'ruggers',
  'openAiApiKey',
  'openAiModel',
  'aiAnalysisEnabled'
];

export function loadConfig(): Config {
  const candidatePaths = [
    path.resolve(process.cwd(), 'src/config/config.json'),
    path.resolve(__dirname, 'config.json'),
  ];
  const configPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!configPath) {
    throw new Error('Missing config.json. Please copy config.example.json to config.json and fill values.');
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);

  for (const field of REQUIRED_FIELDS) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  if (typeof parsed.profitTarget !== 'number' || parsed.profitTarget <= 0) {
    throw new Error('profitTarget must be a positive number');
  }
  if (typeof parsed.lossEstimate !== 'number' || parsed.lossEstimate <= 0) {
    throw new Error('lossEstimate must be a positive number');
  }

  return parsed as Config;
}
