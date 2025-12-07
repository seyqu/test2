use futures::{SinkExt, StreamExt};
use log::{info, warn};
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream, connect_async, tungstenite::protocol::Message,
};

use std::time::Duration;
use tokio::net::TcpStream;

pub type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub async fn connect_with_retry(url: &str) -> Option<WsStream> {
    match connect_async(url).await {
        Ok((stream, _)) => {
            info!("connected to {url}");
            Some(stream)
        }
        Err(err) => {
            warn!("WebSocket connection failed ({url}): {err}; continuing with synthetic feed");
            None
        }
    }
}

pub async fn send_subscription(stream: &mut WsStream, payload: &str) {
    if let Err(err) = stream.send(Message::text(payload)).await {
        warn!("failed to send subscription: {err}");
    }
}

pub async fn read_one(stream: &mut WsStream) -> Option<String> {
    match stream.next().await {
        Some(Ok(Message::Text(txt))) => Some(txt),
        Some(Ok(Message::Binary(bin))) => String::from_utf8(bin).ok(),
        Some(Ok(_)) => None,
        Some(Err(err)) => {
            warn!("ws read error: {err}");
            None
        }
        None => None,
    }
}

pub async fn sleep_ms(ms: u64) {
    tokio::time::sleep(Duration::from_millis(ms)).await;
}
