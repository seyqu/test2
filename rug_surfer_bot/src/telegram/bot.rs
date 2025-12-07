use log::warn;
use std::collections::HashMap;
use std::sync::Arc;
use teloxide::dptree::case;
use teloxide::prelude::*;
use teloxide::types::{InlineKeyboardButton, InlineKeyboardMarkup};
use teloxide::utils::command::BotCommands;
use tokio::sync::Mutex;

use crate::config::AppConfig;
use crate::detection::state::{GlobalState, SimulationPosition};
use crate::solana::cluster::analyze_addresses;
use crate::solana::holders::{seed_holders, spawn_holder_streams};
use crate::solana::logs::{latest_price, spawn_log_stream};
use crate::solana::lp::{seed_pools, spawn_lp_streams};
use crate::utils::time::now_millis;
use crate::utils::types::{MonitoringContext, TelegramState};

#[derive(BotCommands, Clone)]
#[command(rename_rule = "lowercase", description = "Commandes disponibles:")]
pub enum Command {
    #[command(description = "Démarrer le bot")]
    Start,
}

pub struct BotController {
    bot: Bot,
    config: AppConfig,
    pub state: Arc<Mutex<GlobalState>>,
    ctx: Arc<Mutex<MonitoringContext>>,
    user_states: Arc<Mutex<HashMap<ChatId, TelegramState>>>,
}

impl BotController {
    pub fn new(
        bot: Bot,
        config: AppConfig,
        state: Arc<Mutex<GlobalState>>,
        ctx: Arc<Mutex<MonitoringContext>>,
    ) -> Self {
        Self {
            bot,
            config,
            state,
            ctx,
            user_states: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start(self) {
        let handler = Update::filter_message()
            .branch(case![Message { text: Some(text), chat, .. }]
                .endpoint(move |bot: Bot, chat: MessageChat, text: String, controller: Arc<Self>| async move {
                    controller.handle_message(bot, chat.id, text).await;
                }))
            .branch(Update::filter_callback_query().endpoint(move |bot: Bot, q: CallbackQuery, controller: Arc<Self>| async move {
                controller.handle_callback(bot, q).await;
            }))
            .branch(dptree::entry().filter_command::<Command>().endpoint(move |bot: Bot, msg: Message, cmd: Command, controller: Arc<Self>| async move {
                controller.handle_command(bot, msg, cmd).await;
            }));

        Dispatcher::builder(self.bot.clone(), handler)
            .dependencies(dptree::deps![Arc::new(self)])
            .enable_ctrlc_handler()
            .build()
            .dispatch()
            .await;
    }

    async fn handle_command(&self, bot: Bot, msg: Message, cmd: Command) {
        match cmd {
            Command::Start => {
                self.set_user_state(msg.chat.id, TelegramState::Idle).await;
                let keyboard = self.main_keyboard();
                let text = "Bienvenue sur Rug Surfer Bot. Choisissez une action:";
                if let Err(err) = bot
                    .send_message(msg.chat.id, text)
                    .reply_markup(keyboard)
                    .await
                {
                    warn!("failed to send start message: {err}");
                }
            }
        }
    }

    async fn handle_message(&self, bot: Bot, chat: ChatId, text: String) {
        let state = self.get_user_state(chat).await;
        match state {
            TelegramState::AwaitingMint => {
                self.start_monitoring(&bot, chat, text.trim().to_owned())
                    .await;
            }
            TelegramState::AwaitingSimulationAmount => {
                if let Ok(amount) = text.trim().replace(',', ".").parse::<f64>() {
                    self.record_simulated_buy(&bot, chat, amount).await;
                } else {
                    let _ = bot.send_message(chat, "Montant invalide, réessayez.").await;
                }
            }
            _ => {
                let _ = bot
                    .send_message(chat, "Utilisez les boutons pour interagir.")
                    .await;
            }
        }
    }

    async fn handle_callback(&self, bot: Bot, q: CallbackQuery) {
        if let Some(data) = q.data.clone() {
            let chat_id = q.message.as_ref().map(|m| m.chat.id);
            if let Some(chat) = chat_id {
                match data.as_str() {
                    "start_watch" => {
                        self.set_user_state(chat, TelegramState::AwaitingMint).await;
                        let _ = bot
                            .send_message(chat, "Entrez la mint address du token à surveiller :")
                            .await;
                    }
                    "stop_watch" => {
                        self.set_user_state(chat, TelegramState::Idle).await;
                        let mut ctx = self.ctx.lock().await;
                        ctx.tracked_mint = None;
                        let _ = bot.send_message(chat, "Surveillance arrêtée.").await;
                    }
                    "status" => {
                        let lock = self.state.lock().await;
                        let risk = lock.risk_state.p_rug;
                        let price = crate::solana::logs::latest_price(&lock);
                        let message = format!(
                            "Status actuel:\n- p_rug: {:.2}\n- Prix récent: {:.6}",
                            risk, price
                        );
                        let _ = bot.send_message(chat, message).await;
                    }
                    "sim_buy" => {
                        self.set_user_state(chat, TelegramState::AwaitingSimulationAmount)
                            .await;
                        let _ = bot
                            .send_message(
                                chat,
                                "Entrez le montant en SOL à investir virtuellement :",
                            )
                            .await;
                    }
                    "sim_sell" => {
                        if self.has_active_simulation().await {
                            let keyboard = self.sell_keyboard();
                            let _ = bot
                                .send_message(chat, "Choisissez un pourcentage à vendre :")
                                .reply_markup(keyboard)
                                .await;
                            self.set_user_state(chat, TelegramState::AwaitingSellSelection)
                                .await;
                        } else {
                            let _ = bot.send_message(chat, "Aucune position virtuelle active. Faites d’abord un achat simulé.").await;
                        }
                    }
                    data if data.starts_with("sell_pct_") => {
                        if let Some(pct_str) = data.strip_prefix("sell_pct_") {
                            if let Ok(pct) = pct_str.parse::<u8>() {
                                self.process_simulated_sell(&bot, chat, pct).await;
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        if let Some(id) = q.id {
            let _ = bot.answer_callback_query(id).await;
        }
    }

    async fn start_monitoring(&self, bot: &Bot, chat: ChatId, mint: String) {
        {
            let mut ctx = self.ctx.lock().await;
            ctx.active_chat = Some(chat);
            ctx.tracked_mint = Some(mint.clone());
        }

        let holders = seed_holders(self.state.clone(), self.config.holder_subscriptions).await;
        let pools = seed_pools(self.state.clone(), self.config.lp_subscriptions).await;
        spawn_holder_streams(self.state.clone(), holders.clone());
        spawn_lp_streams(self.state.clone(), pools.clone());
        spawn_log_stream(self.state.clone(), self.config.log_depth);

        let profile = analyze_addresses(&holders);
        {
            let mut lock = self.state.lock().await;
            lock.cluster_profile = Some(profile);
            lock.creator_state = Some(crate::detection::state::CreatorState {
                address: format!("CREATOR_{}", &mint[0..mint.len().min(4)]),
                last_activity: now_millis(),
                active: false,
            });
        }

        let message = format!(
            "Surveillance démarrée pour {mint}.\n- Holders suivis: {}\n- Pools: {}\n- Source WS: {}",
            self.config.holder_subscriptions,
            self.config.lp_subscriptions,
            self.config.solana_ws_url
        );
        self.set_user_state(chat, TelegramState::Idle).await;
        let _ = bot.send_message(chat, message).await;
    }

    async fn record_simulated_buy(&self, bot: &Bot, chat: ChatId, sol_amount: f64) {
        let price = {
            let lock = self.state.lock().await;
            latest_price(&lock)
        };
        let token_qty = if price > 0.0 { sol_amount / price } else { 0.0 };
        let position = SimulationPosition {
            timestamp: now_millis(),
            amount_sol: sol_amount,
            buy_price: price,
            token_qty,
            realized_profit_sol: 0.0,
        };
        {
            let mut lock = self.state.lock().await;
            lock.simulations.push(position.clone());
        }
        self.set_user_state(chat, TelegramState::Idle).await;
        let message = format!(
            "Achat virtuel enregistré !\nMontant : {:.2} SOL\nPrix d’entrée : {:.6}\nQuantité virtuelle : {:.2}",
            sol_amount, price, token_qty
        );
        let _ = bot.send_message(chat, message).await;
    }

    async fn process_simulated_sell(&self, bot: &Bot, chat: ChatId, pct: u8) {
        let price = {
            let lock = self.state.lock().await;
            latest_price(&lock)
        };
        let pct_f = pct as f64 / 100.0;
        let mut response = String::new();
        {
            let mut lock = self.state.lock().await;
            if let Some(position) = lock.simulations.last_mut() {
                let qty_sold = position.token_qty * pct_f;
                let sol_received = qty_sold * price;
                position.token_qty -= qty_sold;
                position.realized_profit_sol += sol_received;
                let pnl_pct = if position.amount_sol > 0.0 {
                    (position.realized_profit_sol - position.amount_sol) / position.amount_sol
                        * 100.0
                } else {
                    0.0
                };
                response = format!(
                    "Vente virtuelle effectuée :\n- Pourcentage vendu : {pct}%\n- Prix actuel : {:.6}\n- SOL reçus : {:.4}\n- Profit global virtuel : {:.2}%\nPosition restante : {:.2} tokens",
                    price, sol_received, pnl_pct, position.token_qty
                );
            } else {
                response = "Aucune position virtuelle active.".to_string();
            }
        }
        self.set_user_state(chat, TelegramState::Idle).await;
        let _ = bot.send_message(chat, response).await;
    }

    async fn has_active_simulation(&self) -> bool {
        let lock = self.state.lock().await;
        !lock.simulations.is_empty()
    }

    fn main_keyboard(&self) -> InlineKeyboardMarkup {
        InlineKeyboardMarkup::new(vec![
            vec![
                InlineKeyboardButton::callback("Lancer surveillance token", "start_watch"),
                InlineKeyboardButton::callback("Arrêter surveillance", "stop_watch"),
            ],
            vec![InlineKeyboardButton::callback("Status", "status")],
            vec![
                InlineKeyboardButton::callback("Simuler un achat", "sim_buy"),
                InlineKeyboardButton::callback("Simuler une vente", "sim_sell"),
            ],
        ])
    }

    fn sell_keyboard(&self) -> InlineKeyboardMarkup {
        InlineKeyboardMarkup::new(vec![
            vec![InlineKeyboardButton::callback("Vendre 20 %", "sell_pct_20")],
            vec![InlineKeyboardButton::callback("Vendre 30 %", "sell_pct_30")],
            vec![InlineKeyboardButton::callback("Vendre 50 %", "sell_pct_50")],
            vec![InlineKeyboardButton::callback("Vendre 80 %", "sell_pct_80")],
            vec![InlineKeyboardButton::callback(
                "Tout vendre (100 %)",
                "sell_pct_100",
            )],
        ])
    }

    async fn set_user_state(&self, chat: ChatId, state: TelegramState) {
        let mut map = self.user_states.lock().await;
        map.insert(chat, state);
    }

    async fn get_user_state(&self, chat: ChatId) -> TelegramState {
        let map = self.user_states.lock().await;
        map.get(&chat).copied().unwrap_or(TelegramState::Idle)
    }
}
