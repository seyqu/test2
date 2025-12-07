import { EventEmitter } from 'events';
import { TokenState } from '../utils/types';
import { logger } from '../utils/logger';

export class AxiomWatcher extends EventEmitter {
  private tokens: Map<string, TokenState> = new Map();

  constructor() {
    super();
  }

  start() {
    logger.info('AxiomWatcher started (mock streaming).');
    setInterval(() => {
      // mock token updates for demonstration
      const tokenMint = 'MockTokenMint';
      const now = Date.now();
      const state: TokenState = {
        tokenMint,
        poolAddress: 'MockPool',
        price: 0.001 + Math.random() * 0.0005,
        liquidity: 10 + Math.random() * 5,
        marketCap: 6000 + Math.random() * 2000,
        ageSeconds: (now % 60000) / 1000,
        rugSupplyShare: Math.random() * 0.3,
        rugSupplyDelta: (Math.random() - 0.5) * 0.1,
        concentrationTop3: Math.random() * 0.6,
        liqToMcRatio: 0.001 + Math.random() * 0.002,
        betaRugVolume: Math.random(),
        buyVolume: Math.random() * 50,
        sellVolume: Math.random() * 40,
        buySpeed: Math.random() * 3,
        flashPatternScore: Math.random() * 2,
        multiWalletScore: Math.random(),
        lastUpdated: now,
      };
      this.tokens.set(tokenMint, state);
      this.emit('update', state);
    }, 1000);
  }

  getActiveTokens(): TokenState[] {
    return Array.from(this.tokens.values());
  }
}
