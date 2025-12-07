import { Position } from '../utils/types';

export class PositionManager {
  private positions: Map<string, Position> = new Map();
  private virtualBalanceEur = 0;

  openPosition(position: Position): void {
    this.positions.set(position.tokenMint, position);
  }

  closePosition(tokenMint: string, exitPrice: number, exitReason: string, pRugExit: number): Position | null {
    const pos = this.positions.get(tokenMint);
    if (!pos) return null;
    this.positions.delete(tokenMint);

    const pnlPercent = (exitPrice - pos.entryPrice) / pos.entryPrice;
    const pnlSol = pos.sizeSol * pnlPercent;
    if (pos.simulation) {
      this.virtualBalanceEur += pnlSol * 150; // simple conversion
    }

    return {
      ...pos,
      entryPrice: pos.entryPrice,
      entryTime: pos.entryTime,
      sizeSol: pos.sizeSol,
      sizeTokens: pos.sizeTokens,
      autoMode: pos.autoMode,
      pRugEntry: pos.pRugEntry,
      simulation: pos.simulation,
    };
  }

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getVirtualBalanceEur(): number {
    return this.virtualBalanceEur;
  }
}
