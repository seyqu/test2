import fs from 'fs';
import { TradeExitLog } from '../utils/types';

export class LogManager {
  private logFile = 'trades_log.csv';
  private simLogFile = 'sim_trades_log.csv';

  logTrade(exit: TradeExitLog) {
    const file = exit.simulation ? this.simLogFile : this.logFile;
    const headers = [
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
      'simulation',
      'whaleDumpScore',
    ];

    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, headers.join(',') + '\n');
    }

    const values = [
      exit.tokenMint,
      exit.entryTime,
      exit.exitTime,
      exit.entryPrice,
      exit.exitPrice,
      exit.pnlPercent,
      exit.pnlSol,
      exit.exitReason,
      exit.liquidity,
      exit.marketCap,
      exit.rugSupplyShare,
      exit.rugSupplyDelta,
      exit.concentrationTop3,
      exit.liqToMcRatio,
      exit.betaRugVolume,
      exit.buyVolume,
      exit.sellVolume,
      exit.buySpeed,
      exit.flashPatternScore,
      exit.multiWalletScore,
      exit.pRugEntry,
      exit.pRugExit,
      exit.simulation,
      exit.whaleDumpScore,
    ];

    fs.appendFileSync(file, values.join(',') + '\n');
  }
}
