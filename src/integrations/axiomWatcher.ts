import EventEmitter from 'events';
import { SolanaClient } from './solanaClient';
import { Config, TokenState } from '../utils/types';

const parseMintFromAxiomUrl = (url: string): string | null => {
  try {
    if (!url.includes('axiom.trade')) return url;
    const parts = url.split('/');
    const maybeMint = parts[parts.length - 1].split('?')[0];
    return maybeMint || null;
  } catch (e) {
    return null;
  }
};

export class AxiomWatcher extends EventEmitter {
  private tokenStates: Map<string, TokenState> = new Map();
  private focusToken?: string;
  private interval?: NodeJS.Timeout;

  constructor(private solanaClient: SolanaClient, private config: Config) {
    super();
    if (config.focusTokenMint) this.focusToken = config.focusTokenMint;
    this.bootstrapSimulation();
  }

  private bootstrapSimulation() {
    // Fake live updates to keep the pipeline active even without real WebSocket integration in dev mode
    this.interval = setInterval(() => {
      const mint = this.focusToken || 'SimToken11111111111111111111111111111111111';
      const now = Date.now();
      const prev = this.tokenStates.get(mint);
      const price = (prev?.price || 0.001) * (1 + (Math.random() - 0.5) * 0.01);
      const liquidity = prev?.liquidity || 15000;
      const marketCap = prev?.marketCap || 50000;
      const buyVolume = (prev?.buyVolume || 0) * 0.8 + Math.random() * 1000;
      const sellVolume = (prev?.sellVolume || 0) * 0.8 + Math.random() * 1000;
      const whaleSellVolumeWindow = Math.random() * liquidity * 0.05;
      const whaleSellCountWindow = Math.floor(Math.random() * 3);
      const whaleDumpScore = whaleSellVolumeWindow / Math.max(1, liquidity) * 100 + whaleSellCountWindow;

      const state: TokenState = {
        tokenMint: mint,
        poolAddress: 'SimPool11111111111111111111111111111111111',
        price,
        liquidity,
        marketCap,
        ageSeconds: (prev?.ageSeconds || 0) + this.config.refreshIntervalMs / 1000,
        rugSupplyShare: Math.random() * 0.05,
        rugSupplyDelta: Math.random() * 0.02,
        concentrationTop3: 0.2 + Math.random() * 0.3,
        liqToMcRatio: liquidity / Math.max(1, marketCap),
        betaRugVolume: Math.random(),
        buyVolume,
        sellVolume,
        buySpeed: Math.random() * 5,
        flashPatternScore: Math.random(),
        multiWalletScore: Math.random(),
        lastUpdated: now,
        holders: 100 + Math.floor(Math.random() * 50),
        whaleSellVolumeWindow,
        whaleSellCountWindow,
        whaleDumpScore,
      };
      this.tokenStates.set(mint, state);
      this.emit('update', state);
    }, this.config.refreshIntervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  updateFocusToken(input: string | null) {
    const mint = input ? parseMintFromAxiomUrl(input) : null;
    if (mint) {
      this.focusToken = mint;
      this.tokenStates.delete(mint);
    }
  }

  getFocusToken(): string | undefined {
    return this.focusToken;
  }

  ingestTokenState(state: TokenState) {
    this.tokenStates.set(state.tokenMint, state);
    this.emit('update', state);
  }

  getActiveTokens(): TokenState[] {
    return Array.from(this.tokenStates.values());
  }
}

export const extractMintFromAxiomUrl = parseMintFromAxiomUrl;
