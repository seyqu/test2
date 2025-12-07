use std::sync::Arc;
use std::time::Duration;

use rand::Rng;
use tokio::sync::Mutex;

use crate::detection::state::GlobalState;
use crate::utils::types::{LogEvent, TradeSide};

pub fn spawn_log_stream(state: Arc<Mutex<GlobalState>>, depth: usize) {
    tokio::spawn(async move {
        let mut price: f64 = 0.0025;
        let mut rng = rand::thread_rng();
        let mut slot: u64 = 1;
        loop {
            let delta = rng.gen_range(-0.0001..0.0002);
            price = (price + delta).max(0.00001);
            let side = if rng.gen_bool(0.45) {
                TradeSide::Buy
            } else {
                TradeSide::Sell
            };
            let amount = rng.gen_range(10.0..120.0);
            let event = LogEvent {
                slot,
                price,
                side,
                amount,
            };
            slot += 1;
            {
                let mut lock = state.lock().await;
                lock.push_log(event, depth);
            }
            tokio::time::sleep(Duration::from_millis(220)).await;
        }
    });
}

pub fn latest_price(state: &GlobalState) -> f64 {
    state.logs_state.back().map(|l| l.price).unwrap_or(0.0)
}

pub fn latest_slot(state: &GlobalState) -> u64 {
    state.logs_state.back().map(|l| l.slot).unwrap_or(0)
}
