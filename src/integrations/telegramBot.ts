import TelegramBot from 'node-telegram-bot-api';
import { Config, Position } from '../utils/types';
import { logger } from '../utils/logger';

export class TelegramBotClient {
  private bot: TelegramBot | null = null;

  constructor(private config: Config, private getPositions: () => Position[], private updateConfig: (partial: Partial<Config>) => void) {
    if (config.telegramBotToken) {
      this.bot = new TelegramBot(config.telegramBotToken, { polling: true });
      this.registerHandlers();
      logger.info('Telegram bot initialized');
    }
  }

  private registerHandlers() {
    if (!this.bot) return;
    this.bot.onText(/\/status/, (msg) => {
      const positions = this.getPositions();
      const status = `Positions: ${positions.length}\n${positions
        .map((p) => `${p.tokenMint} size ${p.sizeSol} entry ${p.entryPrice}`)
        .join('\n')}`;
      this.bot!.sendMessage(msg.chat.id, status || 'No positions');
    });

    this.bot.onText(/\/settings/, (msg) => {
      const { profitTarget, lossEstimate, minLiquidity, autoTrading, paperTrading } = this.config;
      this.bot!.sendMessage(
        msg.chat.id,
        `Settings:\nG=${profitTarget}\nL=${lossEstimate}\nminLiquidity=${minLiquidity}\nautoTrading=${autoTrading}\npaperTrading=${paperTrading}`
      );
    });

    this.bot.onText(/\/auto_on/, (msg) => {
      this.updateConfig({ autoTrading: true });
      this.bot!.sendMessage(msg.chat.id, 'Auto trading enabled');
    });
    this.bot.onText(/\/auto_off/, (msg) => {
      this.updateConfig({ autoTrading: false });
      this.bot!.sendMessage(msg.chat.id, 'Auto trading disabled');
    });
    this.bot.onText(/\/paper_on/, (msg) => {
      this.updateConfig({ paperTrading: true });
      this.bot!.sendMessage(msg.chat.id, 'Paper trading enabled');
    });
    this.bot.onText(/\/paper_off/, (msg) => {
      this.updateConfig({ paperTrading: false });
      this.bot!.sendMessage(msg.chat.id, 'Paper trading disabled');
    });

    this.bot.onText(/\/close (.+)/, (msg, match) => {
      const mint = match?.[1];
      // In actual integration, call a closer callback
      this.bot!.sendMessage(msg.chat.id, `Request to close ${mint}`);
    });
  }

  notify(text: string) {
    if (this.bot && this.config.telegramChatId) {
      this.bot.sendMessage(this.config.telegramChatId, text).catch((err) => logger.error(`Telegram send error ${err}`));
    }
  }
}
