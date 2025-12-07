use std::sync::Arc;
use std::time::Duration;

use log::debug;
use teloxide::prelude::*;
use tokio::sync::Mutex;
use tokio::time::interval;

use crate::detection::signals::compute_risk_score;
use crate::detection::state::{GlobalState, SimulationPosition};
use crate::utils::time::now_millis;
use crate::utils::types::MonitoringContext;

pub struct DetectionEngine {
    pub risk_threshold: f64,
}

impl DetectionEngine {
    pub fn new(risk_threshold: f64, _log_depth: usize) -> Self {
        Self { risk_threshold }
    }

    pub fn spawn(
        self,
        bot: Bot,
        state: Arc<Mutex<GlobalState>>,
        ctx: Arc<Mutex<MonitoringContext>>,
    ) {
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_millis(300));
            loop {
                ticker.tick().await;
                let alert_chat = {
                    let ctx_guard = ctx.lock().await;
                    ctx_guard.active_chat
                };
                if alert_chat.is_none() {
                    continue;
                }

                let mut lock = state.lock().await;
                let new_score = compute_risk_score(&lock);
                debug!("risk tick => {new_score:.3}");
                lock.risk_state.p_rug = new_score;

                if new_score >= self.risk_threshold {
                    let last_alert = lock.risk_state.last_alert_ms.unwrap_or(0);
                    let now = now_millis();
                    if now.saturating_sub(last_alert) > 1500 {
                        lock.risk_state.last_alert_ms = Some(now);
                        let simulations = lock.simulations.clone();
                        let latest_price = lock.logs_state.back().map(|l| l.price).unwrap_or(0.0);
                        drop(lock);
                        Self::send_alert(&bot, alert_chat.unwrap(), new_score, latest_price).await;
                        if !simulations.is_empty() {
                            Self::send_simulation_outcomes(
                                &bot,
                                alert_chat.unwrap(),
                                &simulations,
                                latest_price,
                            )
                            .await;
                        }
                    }
                }
            }
        });
    }

    async fn send_alert(bot: &Bot, chat: ChatId, score: f64, price: f64) {
        let text = format!(
            "\u{26a0}\u{fe0f} Rug risk détecté!\nScore: {:.2}\nDernier prix observé: {:.6}",
            score, price
        );
        if let Err(err) = bot.send_message(chat, text).await {
            log::error!("failed to send alert: {err}");
        }
    }

    async fn send_simulation_outcomes(
        bot: &Bot,
        chat: ChatId,
        simulations: &[SimulationPosition],
        rug_price: f64,
    ) {
        for sim in simulations {
            let pnl = if sim.buy_price > 0.0 {
                (rug_price - sim.buy_price) / sim.buy_price * 100.0
            } else {
                0.0
            };
            let delta_ms = now_millis().saturating_sub(sim.timestamp);
            let message = format!(
                "Simulation – Résultat Rug :\n- Buy price : {:.6}\n- Prix avant rug : {:.6}\n- Profit : {:.2}%\n- Δ temps : {} ms",
                sim.buy_price, rug_price, pnl, delta_ms
            );
            if let Err(err) = bot.send_message(chat, message).await {
                log::error!("failed to send simulation rug message: {err}");
            }
        }
    }
}
