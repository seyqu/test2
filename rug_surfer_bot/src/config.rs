use std::{fs, path::Path};

use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub telegram_token: String,
    pub solana_ws_url: String,
    pub risk_threshold: f64,
    pub holder_subscriptions: usize,
    pub lp_subscriptions: usize,
    pub log_depth: usize,
}

impl AppConfig {
    pub fn load_from_file(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let data = fs::read_to_string(path)?;
        let config: AppConfig = serde_json::from_str(&data)?;
        Ok(config)
    }
}
