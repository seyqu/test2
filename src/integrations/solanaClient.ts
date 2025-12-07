import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Config, SolanaClients } from '../utils/types';
import { logger } from '../utils/logger';

export function initSolanaClients(config: Config): { clients: SolanaClients; wallet: Keypair } {
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const wsConnection = new Connection(config.wsUrl, 'confirmed');
  const privateKey = config.privateKey.startsWith('[')
    ? Uint8Array.from(JSON.parse(config.privateKey))
    : bs58.decode(config.privateKey);
  const wallet = Keypair.fromSecretKey(privateKey);
  return { clients: { connection, wsConnection }, wallet };
}

export class SolanaClient {
  private connection: Connection;
  private wsConnection: Connection;
  private wallet: Keypair;
  private priorityFee: number;

  constructor(config: Config) {
    const { clients, wallet } = initSolanaClients(config);
    this.connection = clients.connection;
    this.wsConnection = clients.wsConnection;
    this.wallet = wallet;
    this.priorityFee = config.priorityFeeMicroLamports;
  }

  async getWalletTokenBalance(mint: string): Promise<number> {
    try {
      const resp = await this.connection.getParsedTokenAccountsByOwner(this.wallet.publicKey, { mint });
      const value = resp.value[0]?.account?.data?.parsed?.info?.tokenAmount;
      return value ? Number(value.uiAmount || 0) : 0;
    } catch (err) {
      logger.error(`Failed to fetch token balance: ${err}`);
      return 0;
    }
  }

  async getTokenInfo(mint: string): Promise<{ decimals: number; supply: number }> {
    const supplyInfo = await this.connection.getTokenSupply(mint);
    const decimals = supplyInfo.value.decimals;
    const supply = Number(supplyInfo.value.uiAmount || 0);
    return { decimals, supply };
  }

  async sendTransaction(tx: Transaction): Promise<string> {
    try {
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      tx.feePayer = this.wallet.publicKey;
      tx.instructions = [
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.priorityFee,
        }),
        ...tx.instructions,
      ];
      tx.sign(this.wallet);
      const sig = await sendAndConfirmTransaction(this.connection, tx, [this.wallet], {
        commitment: 'confirmed',
      });
      return sig;
    } catch (err) {
      logger.error(`Failed to send transaction: ${err}`);
      throw err;
    }
  }

  subscribeLogs(filter: string | { mentions: string[] }, callback: (log: any) => void) {
    return this.wsConnection.onLogs(filter as any, callback, 'confirmed');
  }
}
