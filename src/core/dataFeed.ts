import { TokenState } from '../utils/types';

export class DataFeed {
  private priceHistory: Map<string, number[]> = new Map();
  private maxLen = 50;

  pushState(state: TokenState) {
    const arr = this.priceHistory.get(state.tokenMint) || [];
    arr.push(state.price);
    if (arr.length > this.maxLen) arr.shift();
    this.priceHistory.set(state.tokenMint, arr);
  }

  getRecentPrices(tokenMint: string): number[] {
    return this.priceHistory.get(tokenMint) || [];
  }
}
