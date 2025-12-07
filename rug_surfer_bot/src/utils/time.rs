use chrono::Utc;

/// Returns current timestamp in milliseconds.
pub fn now_millis() -> u64 {
    Utc::now().timestamp_millis() as u64
}
