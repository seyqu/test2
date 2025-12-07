use serde::{Deserialize, Serialize};
use teloxide::types::ChatId;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TradeSide {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountBalanceUpdate {
    pub owner: String,
    pub balance: f64,
    pub previous_balance: f64,
    pub slot: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityUpdate {
    pub pool: String,
    pub liquidity: f64,
    pub previous_liquidity: f64,
    pub slot: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    pub slot: u64,
    pub price: f64,
    pub side: TradeSide,
    pub amount: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TelegramState {
    Idle,
    AwaitingMint,
    AwaitingSimulationAmount,
    AwaitingSellSelection,
}

#[derive(Debug, Clone)]
pub struct MonitoringContext {
    pub active_chat: Option<ChatId>,
    pub tracked_mint: Option<String>,
}

impl MonitoringContext {
    pub fn new() -> Self {
        Self {
            active_chat: None,
            tracked_mint: None,
        }
    }
}
