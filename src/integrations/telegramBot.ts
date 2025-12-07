import TelegramBot from 'node-telegram-bot-api';
import { AxiomWatcher, extractMintFromAxiomUrl } from './axiomWatcher';
import { PositionManager } from '../core/positionManager';
import { Config, Position, TokenState } from '../utils/types';
import { FeatureEngine } from '../core/featureEngine';

export class TelegramInterface {
  private bot?: TelegramBot;
  private chatId?: number;
  private labelSimulation = '[SIMULATION]';

  constructor(
    private config: Config,
    private watcher: AxiomWatcher,
    private positionManager: PositionManager,
    private featureEngine: FeatureEngine,
  ) {
    if (process.env.TELEGRAM_TOKEN) {
      this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
      this.registerHandlers();
    }
  }

  private registerHandlers() {
    if (!this.bot) return;
    this.bot.onText(/\/start/, (msg) => {
      this.chatId = msg.chat.id;
      this.sendMessage(
        `Bot démarré en MODE ESSAI / SIMULATION – paperTrading = ${this.config.paperTrading}, autoTrading = ${this.config.autoTrading}, simulationEntrySizeEur = ${this.config.simulationEntrySizeEur}.`,
      );
    });

    this.bot.onText(/\/status/, () => this.handleStatus());
    this.bot.onText(/\/auto_on/, () => this.toggleAuto(true));
    this.bot.onText(/\/auto_off/, () => this.toggleAuto(false));
    this.bot.onText(/\/paper_on/, () => this.togglePaper(true));
    this.bot.onText(/\/paper_off/, () => this.togglePaper(false));
    this.bot.onText(/\/sim_mode/, () => this.togglePaper(true));
    this.bot.onText(/\/live_mode/, () => this.togglePaper(false));
    this.bot.onText(/\/close (.+)/, (_msg, match) => {
      const mint = match?.[1];
      if (mint) {
        const pos = this.positionManager.getOpenPositions().find((p) => p.tokenMint === mint);
        if (pos) {
          this.positionManager.closePosition(mint, pos.entryPrice, 'MANUAL', pos.pRugEntry);
          this.sendMessage(`Position ${mint} fermée manuellement.`);
        }
      }
    });

    this.bot.onText(/\/track (.+)/, (_msg, match) => {
      const value = match?.[1];
      if (!value) return;
      const mint = extractMintFromAxiomUrl(value);
      this.watcher.updateFocusToken(mint);
      this.sendMessage(`Token suivi mis à jour: ${mint}`);
    });

    this.bot.onText(/\/token/, () => this.handleToken());
    this.bot.onText(/\/holders/, () => this.handleHolders());
    this.bot.onText(/\/rug_risk/, () => this.handleRugRisk());
  }

  private toggleAuto(on: boolean) {
    this.config.autoTrading = on;
    this.sendMessage(`Auto-trading ${on ? 'activé' : 'désactivé'}.`);
  }

  private togglePaper(on: boolean) {
    this.config.paperTrading = on;
    this.sendMessage(`${on ? 'Mode simulation' : 'Mode live'} sélectionné.`);
  }

  sendMessage(text: string, extra?: TelegramBot.SendMessageOptions) {
    if (this.bot && this.chatId) {
      this.bot.sendMessage(this.chatId, text, extra).catch(() => undefined);
    } else {
      console.log('[Telegram]', text);
    }
  }

  notifySignal(token: TokenState, info: string) {
    const prefix = this.config.paperTrading ? `${this.labelSimulation} ` : '';
    this.sendMessage(`${prefix}Signal sur ${token.tokenMint}: ${info}`);
  }

  notifyRugpullAlert(token: TokenState, summary: string) {
    const prefix = this.config.paperTrading ? '[SIMULATION] ' : '';
    this.sendMessage(`🚨 ${prefix}[ALERTE RUGPULL]\n${summary}`);
  }

  notifyEntry(position: Position) {
    const prefix = position.simulation ? this.labelSimulation : '[LIVE]';
    this.sendMessage(`${prefix} Entrée sur ${position.tokenMint} à ${position.entryPrice}`);
  }

  notifyExit(tokenMint: string, reason: string, pnlPercent: number) {
    const prefix = this.config.paperTrading ? this.labelSimulation : '[LIVE]';
    this.sendMessage(`${prefix} Sortie ${tokenMint} (${reason}) PnL ${(pnlPercent * 100).toFixed(2)}%`);
  }

  private handleStatus() {
    const focus = this.watcher.getFocusToken() || 'Aucun';
    const positions = this.positionManager.getOpenPositions();
    const tokenState = this.watcher.getActiveTokens().find((t) => t.tokenMint === focus);
    const lines = [
      `Token suivi: ${focus}`,
      `Lien Axiom: https://axiom.trade/meme/${focus}?chain=sol`,
      `Mode: ${this.config.paperTrading ? 'SIMULATION' : 'LIVE'}`,
      `Auto-trading: ${this.config.autoTrading ? 'ON' : 'OFF'}`,
      `Positions ouvertes: ${positions.length}`,
    ];
    if (tokenState) {
      lines.push(`Prix: ${tokenState.price.toFixed(8)}`, `Liquidité: ${tokenState.liquidity}`, `MCAP: ${tokenState.marketCap}`);
    }
    lines.push(`Solde virtuel: ${this.positionManager.getVirtualBalanceEur().toFixed(2)} EUR`);
    this.sendMessage(lines.join('\n'), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '▶ Auto ON', callback_data: 'auto_on' },
            { text: '⏸ Auto OFF', callback_data: 'auto_off' },
          ],
          [
            { text: '🧪 SIMULATION', callback_data: 'sim' },
            { text: '🔥 LIVE', callback_data: 'live' },
          ],
          [{ text: '📊 Token Info', callback_data: 'token_info' }],
        ],
      },
    });
  }

  private handleToken() {
    const focus = this.watcher.getFocusToken();
    if (!focus) {
      this.sendMessage('Aucun token suivi. Utilise /track <url_axiom>.');
      return;
    }
    const token = this.watcher.getActiveTokens().find((t) => t.tokenMint === focus);
    if (!token) {
      this.sendMessage(`Pas de données pour ${focus} encore.`);
      return;
    }
    this.sendMessage(
      `Token ${focus}\nPrix: ${token.price}\nLiquidité: ${token.liquidity}\nMCAP: ${token.marketCap}\nHolders: ${token.holders ?? 'n/a'}`,
    );
  }

  private handleHolders() {
    const focus = this.watcher.getFocusToken();
    const token = focus ? this.watcher.getActiveTokens().find((t) => t.tokenMint === focus) : undefined;
    if (token?.holders) {
      this.sendMessage(`Holders ${focus}: ${token.holders}`);
    } else {
      this.sendMessage('Infos holders indisponibles.');
    }
  }

  private handleRugRisk() {
    const focus = this.watcher.getFocusToken();
    const token = focus ? this.watcher.getActiveTokens().find((t) => t.tokenMint === focus) : undefined;
    if (!token) {
      this.sendMessage('Aucun token suivi.');
      return;
    }
    const features = this.featureEngine.buildFeatures(token, { history: [token], now: Date.now() });
    const risk = (features.rugSupplyShare + features.rugSupplyDelta + features.multiWalletScore) / 3;
    this.sendMessage(`p_rug approximatif pour ${token.tokenMint}: ${(risk * 100).toFixed(2)}%`);
  }
}
