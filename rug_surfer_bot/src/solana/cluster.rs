#[derive(Debug, Clone)]
pub struct ClusterProfile {
    pub suspicious_wallets: usize,
    pub tagged_wallets: Vec<String>,
    pub lp_candidates: Vec<String>,
}

impl ClusterProfile {
    pub fn empty() -> Self {
        Self {
            suspicious_wallets: 0,
            tagged_wallets: Vec::new(),
            lp_candidates: Vec::new(),
        }
    }
}

pub fn analyze_addresses(addresses: &[String]) -> ClusterProfile {
    let mut profile = ClusterProfile::empty();
    for addr in addresses {
        if addr.ends_with('0') || addr.ends_with('f') {
            profile.suspicious_wallets += 1;
            profile.tagged_wallets.push(addr.clone());
        }
        if addr.starts_with('L') {
            profile.lp_candidates.push(addr.clone());
        }
    }
    profile
}
