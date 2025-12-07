use std::collections::VecDeque;

use crate::solana::cluster::ClusterProfile;
use crate::utils::types::LogEvent;

#[derive(Debug, Clone)]
pub struct HolderState {
    pub owner: String,
    pub balance: f64,
    pub previous_balance: f64,
    pub last_update: u64,
    pub is_suspicious: bool,
}

#[derive(Debug, Clone)]
pub struct LiquidityPoolState {
    pub pool: String,
    pub liquidity: f64,
    pub previous_liquidity: f64,
    pub last_change: u64,
}

#[derive(Debug, Clone)]
pub struct CreatorState {
    pub address: String,
    pub last_activity: u64,
    pub active: bool,
}

#[derive(Debug, Clone)]
pub struct SimulationPosition {
    pub timestamp: u64,
    pub amount_sol: f64,
    pub buy_price: f64,
    pub token_qty: f64,
    pub realized_profit_sol: f64,
}

#[derive(Debug, Clone)]
pub struct RiskState {
    pub p_rug: f64,
    pub last_alert_ms: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct GlobalState {
    pub holders_state: Vec<HolderState>,
    pub lp_state: Vec<LiquidityPoolState>,
    pub logs_state: VecDeque<LogEvent>,
    pub creator_state: Option<CreatorState>,
    pub simulations: Vec<SimulationPosition>,
    pub risk_state: RiskState,
    pub cluster_profile: Option<ClusterProfile>,
}

impl GlobalState {
    pub fn new(log_depth: usize) -> Self {
        Self {
            holders_state: Vec::new(),
            lp_state: Vec::new(),
            logs_state: VecDeque::with_capacity(log_depth),
            creator_state: None,
            simulations: Vec::new(),
            risk_state: RiskState {
                p_rug: 0.0,
                last_alert_ms: None,
            },
            cluster_profile: None,
        }
    }

    pub fn push_log(&mut self, event: LogEvent, depth: usize) {
        if self.logs_state.len() == depth {
            self.logs_state.pop_front();
        }
        self.logs_state.push_back(event);
    }
}
