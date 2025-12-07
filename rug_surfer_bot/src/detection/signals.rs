use std::collections::HashMap;

use crate::detection::state::{GlobalState, HolderState, LiquidityPoolState};
use crate::utils::time::now_millis;
use crate::utils::types::{LogEvent, TradeSide};

fn holder_drop_score(holder: &HolderState) -> f64 {
    if holder.previous_balance <= 0.0 {
        return 0.0;
    }
    let drop = (holder.previous_balance - holder.balance) / holder.previous_balance;
    if drop <= 0.05 {
        0.0
    } else if drop >= 0.3 {
        1.0
    } else {
        drop / 0.3
    }
}

fn liquidity_drop_score(pool: &LiquidityPoolState) -> f64 {
    if pool.previous_liquidity <= 0.0 {
        return 0.0;
    }
    let drop = (pool.previous_liquidity - pool.liquidity) / pool.previous_liquidity;
    if drop <= 0.05 {
        0.0
    } else if drop >= 0.25 {
        1.0
    } else {
        drop / 0.25
    }
}

fn synchronous_sells(logs: &[LogEvent]) -> f64 {
    let mut per_slot: HashMap<u64, usize> = HashMap::new();
    for log in logs.iter().filter(|l| matches!(l.side, TradeSide::Sell)) {
        *per_slot.entry(log.slot).or_default() += 1;
    }
    let max_bundle = per_slot.values().copied().max().unwrap_or(0);
    if max_bundle >= 4 {
        1.0
    } else {
        max_bundle as f64 / 4.0
    }
}

fn creator_reactivation(state: &GlobalState) -> f64 {
    if let Some(creator) = &state.creator_state {
        let idle_ms = now_millis().saturating_sub(creator.last_activity);
        if creator.active && idle_ms > 10_000 {
            return 0.6;
        } else if creator.active {
            return 0.3;
        }
    }
    0.0
}

pub fn compute_risk_score(state: &GlobalState) -> f64 {
    let holder_signal = state
        .holders_state
        .iter()
        .map(holder_drop_score)
        .fold(0.0, |acc, v| acc.max(v));

    let lp_signal = state
        .lp_state
        .iter()
        .map(liquidity_drop_score)
        .fold(0.0, |acc, v| acc.max(v));

    let log_vec: Vec<LogEvent> = state.logs_state.iter().cloned().collect();
    let synch_signal = synchronous_sells(&log_vec);
    let creator_signal = creator_reactivation(state);

    let weak_signal = if let Some(profile) = &state.cluster_profile {
        if profile.suspicious_wallets > 0 {
            0.15
        } else {
            0.0
        }
    } else {
        0.0
    };

    let mut combined = 0.2 * holder_signal
        + 0.25 * lp_signal
        + 0.25 * synch_signal
        + 0.2 * creator_signal
        + weak_signal;
    if holder_signal > 0.9 && lp_signal > 0.6 {
        combined = (combined + 0.3).min(1.0);
    }
    combined.min(1.0)
}
