# Axiom Rug Surfer

A simplified proof-of-concept bot for monitoring Axiom token events, computing rug risk, and auto/paper trading via Jupiter on Solana.

## Setup

1. Copy `src/config/config.example.json` to `src/config/config.json` and fill values.
2. Install dependencies: `npm install`.
3. Build: `npm run build`.
4. Run: `npm start`.

## Notes

- Uses mock Axiom watcher for demonstration.
- Telegram notifications require valid bot token and chat id.
- LLM analysis requires OpenAI-compatible API key/model.
