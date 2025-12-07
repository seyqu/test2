import fetch from 'node-fetch';
import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaClient } from './solanaClient';

const JUPITER_API = 'https://quote-api.jup.ag/v6';

export class JupiterClient {
  constructor(private solanaClient: SolanaClient) {}

  private async fetchQuote(inputMint: string, outputMint: string, amount: number) {
    const url = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Jupiter quote failed: ${res.statusText}`);
    return res.json();
  }

  private async fetchSwap(route: any, userPublicKey: PublicKey) {
    const res = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route,
        userPublicKey: userPublicKey.toBase58(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 10_000,
      }),
    });
    if (!res.ok) throw new Error(`Jupiter swap failed: ${res.statusText}`);
    return res.json();
  }

  private deserializeTransaction(serialized: string): Transaction {
    const buffer = Buffer.from(serialized, 'base64');
    const tx = Transaction.from(buffer);
    return tx;
  }

  async buildSwapTxSolToToken(tokenMint: string, amountLamports: number): Promise<Transaction> {
    const quote = await this.fetchQuote('So11111111111111111111111111111111111111112', tokenMint, amountLamports);
    const payer = this.solanaClient.getPayer?.() ?? (this.solanaClient as any)['payer'];
    if (!payer) throw new Error('No payer configured');
    const swap = await this.fetchSwap(quote, payer.publicKey);
    return this.deserializeTransaction(swap.swapTransaction);
  }

  async buildSwapTxTokenToSol(tokenMint: string, amountTokens: number): Promise<Transaction> {
    const quote = await this.fetchQuote(tokenMint, 'So11111111111111111111111111111111111111112', amountTokens);
    const payer = this.solanaClient.getPayer?.() ?? (this.solanaClient as any)['payer'];
    if (!payer) throw new Error('No payer configured');
    const swap = await this.fetchSwap(quote, payer.publicKey);
    return this.deserializeTransaction(swap.swapTransaction);
  }
}
