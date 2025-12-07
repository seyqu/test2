import { Position } from '../utils/types';
import { logger } from '../utils/logger';

export class PositionManager {
  private positions: Map<string, Position> = new Map();

  openPosition(position: Position): void {
    this.positions.set(position.tokenMint, position);
    logger.info(`Opened position on ${position.tokenMint} size ${position.sizeSol} SOL at ${position.entryPrice}`);
  }

  closePosition(tokenMint: string, exitPrice: number, exitReason: string, pRugExit: number): Position | null {
    const pos = this.positions.get(tokenMint);
    if (!pos) return null;
    this.positions.delete(tokenMint);
    logger.info(`Closed position ${tokenMint} at ${exitPrice} reason=${exitReason} pRug=${pRugExit}`);
    return pos;
  }

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }
}
