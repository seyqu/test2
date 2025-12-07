import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Config } from '../utils/types';

export class SolanaClient {
  private connection: Connection;
  private wsConnection: Connection;
  private payer?: Keypair;

  constructor(private config: Config) {
    this.connection = new Connection(config.rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.wsUrl,
    });
    this.wsConnection = new Connection(config.rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: config.wsUrl,
    });

    if (config.privateKey) {
      const secret = bs58.decode(config.privateKey);
      this.payer = Keypair.fromSecretKey(secret);
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getPayer(): Keypair | undefined {
    return this.payer;
  }

  getWalletTokenBalance = async (mint: string): Promise<number> => {
    if (!this.payer) return 0;
    const accounts = await this.connection.getParsedTokenAccountsByOwner(this.payer.publicKey, { mint: new PublicKey(mint) });
    const balance = accounts.value.reduce((acc, account) => {
      const amount = (account.account.data as any).parsed.info.tokenAmount.uiAmount || 0;
      return acc + amount;
    }, 0);
    return balance;
  };

  getTokenInfo = async (mint: string): Promise<{ decimals: number; supply: number }> => {
    const info = await this.connection.getParsedAccountInfo(new PublicKey(mint));
    const decimals = (info.value?.data as any)?.parsed?.info?.decimals ?? 0;
    const supplyRaw = await this.connection.getTokenSupply(new PublicKey(mint));
    const supply = Number(supplyRaw.value.uiAmount || 0);
    return { decimals, supply };
  };

  sendTransaction = async (tx: Transaction): Promise<string> => {
    if (!this.payer) throw new Error('No payer configured for live trading');
    tx.feePayer = this.payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

    const computeIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 });
    tx.add(computeIx);

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer], {
      commitment: 'confirmed',
    });
    return signature;
  };

  subscribeLogs(filter: any, callback: (log: any) => void): () => void {
    const idPromise = this.wsConnection.onLogs(filter, callback, 'confirmed');
    return () => {
      idPromise.then((id) => this.wsConnection.removeOnLogsListener(id)).catch(() => undefined);
    };
  }
}
