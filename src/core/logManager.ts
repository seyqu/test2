import fs from 'fs';
import path from 'path';
import { Features, Position } from '../utils/types';

const LOG_PATH = path.resolve(process.cwd(), 'trades_log.csv');
const HEADER = [
  'tokenMint',
  'entryTime',
  'exitTime',
  'entryPrice',
  'exitPrice',
  'pnlPercent',
  'pnlSol',
  'exitReason',
  'liquidity',
  'marketCap',
  'rugSupplyShare',
  'rugSupplyDelta',
  'concentrationTop3',
  'liqToMcRatio',
  'betaRugVolume',
  'buyVolume',
  'sellVolume',
  'buySpeed',
  'flashPatternScore',
  'multiWalletScore',
  'p_rug_entry',
  'p_rug_exit',
];

export class LogManager {
  constructor() {
    if (!fs.existsSync(LOG_PATH)) {
      fs.writeFileSync(LOG_PATH, `${HEADER.join(',')}\n`);
    }
  }

  appendTrade(
    position: Position,
    exitPrice: number,
    exitReason: string,
    pRugExit: number,
    features: Features
  ) {
    const exitTime = Date.now();
    const pnlPercent = (exitPrice - position.entryPrice) / position.entryPrice;
    const pnlSol = position.sizeSol * pnlPercent;
    const row = [
      position.tokenMint,
      position.entryTime,
      exitTime,
      position.entryPrice,
      exitPrice,
      pnlPercent,
      pnlSol,
      exitReason,
      features.liquidity,
      features.marketCap,
      features.rugSupplyShare,
      features.rugSupplyDelta,
      features.concentrationTop3,
      features.liqToMcRatio,
      features.betaRugVolume,
      features.buyVolume,
      features.sellVolume,
      features.buySpeed,
      features.flashPatternScore,
      features.multiWalletScore,
      position.pRugEntry,
      pRugExit,
    ];
    fs.appendFileSync(LOG_PATH, `${row.join(',')}\n`);
  }
}
