use std::sync::Arc;
use std::time::Duration;

use rand::Rng;
use tokio::sync::Mutex;

use crate::detection::state::LiquidityPoolState;
use crate::utils::time::now_millis;

pub async fn seed_pools(
    state: Arc<Mutex<crate::detection::state::GlobalState>>,
    count: usize,
) -> Vec<String> {
    let mut rng = rand::thread_rng();
    let mut pools = Vec::new();
    let mut lock = state.lock().await;
    lock.lp_state.clear();
    for i in 0..count {
        let pool = format!("LP_POOL_{:02X}", i);
        let liq = rng.gen_range(1_000.0..5_000.0);
        pools.push(pool.clone());
        lock.lp_state.push(LiquidityPoolState {
            pool,
            liquidity: liq,
            previous_liquidity: liq,
            last_change: now_millis(),
        });
    }
    pools
}

pub fn spawn_lp_streams(
    state: Arc<Mutex<crate::detection::state::GlobalState>>,
    pools: Vec<String>,
) {
    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        loop {
            {
                let mut lock = state.lock().await;
                for pool in lock.lp_state.iter_mut() {
                    let jitter = rng.gen_range(-60.0..40.0);
                    pool.previous_liquidity = pool.liquidity;
                    pool.liquidity = (pool.liquidity + jitter).max(0.0);
                    pool.last_change = now_millis();
                }
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    });

    tokio::spawn(async move {
        let mut rng = rand::thread_rng();
        loop {
            let idx = rng.gen_range(0..pools.len());
            let drop = rng.gen_range(300.0..900.0);
            let pool = pools[idx].clone();
            {
                let mut lock = state.lock().await;
                if let Some(lp) = lock.lp_state.iter_mut().find(|p| p.pool == pool) {
                    lp.previous_liquidity = lp.liquidity;
                    lp.liquidity = (lp.liquidity - drop).max(0.0);
                    lp.last_change = now_millis();
                }
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}
