import axios from 'axios';
import { Transaction } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { Config } from '../utils/types';

const JUPITER_BASE = 'https://quote-api.jup.ag/v6';

export class JupiterClient {
  constructor(private config: Config) {}

  private async fetchQuote(inputMint: string, outputMint: string, amount: number) {
    const url = `${JUPITER_BASE}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${this.config.slippageBps}`;
    const { data } = await axios.get(url);
    return data;
  }

  private async fetchSwapTransaction(route: any) {
    const { data } = await axios.post(`${JUPITER_BASE}/swap`, {
      route,
      userPublicKey: route.userPublicKey,
      wrapAndUnwrapSol: true,
    });
    return data;
  }

  private deserializeSwap(serialized: string): Transaction {
    return Transaction.from(Buffer.from(serialized, 'base64'));
  }

  async buildSwapTxSolToToken(tokenMint: string, amountLamports: number): Promise<Transaction> {
    try {
      const route = await this.fetchQuote('So11111111111111111111111111111111111111112', tokenMint, amountLamports);
      if (!route || !route.routes?.length) {
        throw new Error('No route found');
      }
      const swap = await this.fetchSwapTransaction({ ...route.routes[0], userPublicKey: route.userPublicKey });
      return this.deserializeSwap(swap.swapTransaction);
    } catch (err) {
      logger.error(`Failed to build SOL->token swap: ${err}`);
      throw err;
    }
  }

  async buildSwapTxTokenToSol(tokenMint: string, amountTokens: number): Promise<Transaction> {
    try {
      const route = await this.fetchQuote(tokenMint, 'So11111111111111111111111111111111111111112', amountTokens);
      if (!route || !route.routes?.length) {
        throw new Error('No route found');
      }
      const swap = await this.fetchSwapTransaction({ ...route.routes[0], userPublicKey: route.userPublicKey });
      return this.deserializeSwap(swap.swapTransaction);
    } catch (err) {
      logger.error(`Failed to build token->SOL swap: ${err}`);
      throw err;
    }
  }
}
