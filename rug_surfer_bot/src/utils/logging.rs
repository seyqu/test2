use env_logger::Env;

pub fn init_logging() {
    let env = Env::default().default_filter_or("info");
    env_logger::Builder::from_env(env)
        .format_timestamp_millis()
        .init();
}
