use std::sync::Arc;
use std::time::Duration;

use log::info;
use rand::Rng;
use tokio::sync::Mutex;

use crate::detection::state::{GlobalState, HolderState};
use crate::utils::time::now_millis;

pub async fn seed_holders(state: Arc<Mutex<GlobalState>>, count: usize) -> Vec<String> {
    let mut rng = rand::thread_rng();
    let mut holders = Vec::new();
    let mut lock = state.lock().await;
    lock.holders_state.clear();
    for i in 0..count {
        let owner = format!("HOLDER_{:02X}", i);
        let balance = rng.gen_range(500.0..1500.0);
        holders.push(owner.clone());
        lock.holders_state.push(HolderState {
            owner,
            balance,
            previous_balance: balance,
            last_update: now_millis(),
            is_suspicious: i % 5 == 0,
        });
    }
    holders
}

pub fn spawn_holder_streams(state: Arc<Mutex<GlobalState>>, holders: Vec<String>) {
    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        loop {
            {
                let mut lock = state.lock().await;
                for holder in lock.holders_state.iter_mut() {
                    let jitter: f64 = rng.gen_range(-30.0..20.0);
                    holder.previous_balance = holder.balance;
                    holder.balance = (holder.balance + jitter).max(0.0);
                    holder.last_update = now_millis();
                }
            }
            tokio::time::sleep(Duration::from_millis(420)).await;
        }
    });

    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        loop {
            let idx = rng.gen_range(0..holders.len());
            let drop = rng.gen_range(20.0..120.0);
            let address = holders[idx].clone();
            {
                let mut lock = state.lock().await;
                if let Some(holder) = lock.holders_state.iter_mut().find(|h| h.owner == address) {
                    holder.previous_balance = holder.balance;
                    holder.balance = (holder.balance - drop).max(0.0);
                    holder.last_update = now_millis();
                    info!(
                        "simulated heavy sell for holder {} (-{:.2})",
                        holder.owner, drop
                    );
                }
            }
            tokio::time::sleep(Duration::from_secs(3)).await;
        }
    });
}
