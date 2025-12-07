mod config;
mod detection;
mod solana;
mod telegram;
mod utils;

use std::sync::Arc;

use detection::engine::DetectionEngine;
use detection::state::GlobalState;
use teloxide::prelude::*;
use tokio::sync::Mutex;

use crate::config::AppConfig;
use crate::telegram::bot::BotController;
use crate::utils::logging::init_logging;
use crate::utils::types::MonitoringContext;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_logging();
    let config = AppConfig::load_from_file("config.json")?;
    let bot = Bot::new(config.telegram_token.clone());

    let shared_state = Arc::new(Mutex::new(GlobalState::new(config.log_depth)));
    let ctx = Arc::new(Mutex::new(MonitoringContext::new()));

    let detection_engine = DetectionEngine::new(config.risk_threshold, config.log_depth);
    detection_engine.spawn(bot.clone(), shared_state.clone(), ctx.clone());

    let controller = BotController::new(
        bot.clone(),
        config.clone(),
        shared_state.clone(),
        ctx.clone(),
    );
    controller.start().await;

    Ok(())
}
