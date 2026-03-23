# macrolyst-ws — Real-Time Price WebSocket Server

## Overview

A Node.js (TypeScript) WebSocket relay server deployed on Railway (Hobby plan). Maintains a single persistent Finnhub WebSocket connection and fans out real-time price updates to connected browser clients. Active 6 AM - 6 PM CST weekdays only; idle outside those hours.

Separate repo at `C:\Users\vasti\OneDrive\Desktop\extra\macrolyst-ws`, deployed to Railway, with its own GitHub repo.

## Architecture

```
Browser ──WebSocket──→ Railway (macrolyst-ws) ──WebSocket──→ Finnhub
  ↑                         |
  └── price updates ────────┘
```

- **Single Finnhub connection**, multiple client connections.
- Server tracks which tickers each client cares about via reference counting.
- Finnhub free tier supports up to 50 concurrent symbol subscriptions.

## Connection Flow

1. Browser opens WebSocket to `wss://macrolyst-ws.up.railway.app`
2. Sends auth message: `{ type: "auth", key: "<shared API key>" }`
3. Server validates key, rejects if wrong
4. Client sends subscribe message: `{ type: "subscribe", symbols: ["AAPL", "MSFT", ...] }`
5. Server subscribes those symbols on Finnhub (if not already subscribed)
6. Finnhub pushes trade data → server relays to all clients subscribed to that symbol
7. On disconnect, server decrements ref counts and unsubscribes symbols no one needs

## Message Protocol

### Client → Server

| Message | Fields | Purpose |
|---------|--------|---------|
| `auth` | `{ type: "auth", key: string }` | Authenticate with shared secret |
| `subscribe` | `{ type: "subscribe", symbols: string[] }` | Subscribe to tickers |
| `unsubscribe` | `{ type: "unsubscribe", symbols: string[] }` | Unsubscribe from tickers |

Any message sent before successful auth is rejected with `{ type: "error", message: "not authenticated" }`.

### Server → Client

| Message | Fields | Purpose |
|---------|--------|---------|
| `auth` | `{ type: "auth", status: "ok" \| "error" }` | Auth result |
| `price` | `{ type: "price", symbol: string, price: number, volume: number, timestamp: number }` | Real-time price update (trade-level) |
| `subscribed` | `{ type: "subscribed", symbols: string[] }` | Confirms which symbols were subscribed |
| `unsubscribed` | `{ type: "unsubscribed", symbols: string[] }` | Confirms which symbols were unsubscribed |
| `status` | `{ type: "status", serverActive: boolean, message?: string }` | Server active window changes (6AM-6PM CST) |
| `error` | `{ type: "error", message: string }` | Errors (symbol cap, auth failure, etc.) |

### Finnhub trade batching

Finnhub sends trade data in batched arrays (multiple trades per message). Server extracts the latest trade per symbol from each batch and relays only that. One `price` message per symbol per Finnhub batch.

## Market Hours Logic

- **6 AM - 6 PM CST, weekdays:** Finnhub WebSocket connected, prices flowing. Server sends `{ type: "status", serverActive: true }` to clients.
- **Outside hours:** Finnhub WebSocket disconnected. Server stays up but sends `{ type: "status", serverActive: false }` to new connections. Near-zero CPU usage.
- Server checks schedule every minute. Connects Finnhub at 6 AM, disconnects at 6 PM.
- Uses `America/Chicago` timezone (CST/CDT).
- **Holidays:** Not handled — server will connect on market holidays and sit idle. Accepted trade-off (~10 days/year, negligible cost).
- The frontend continues to use its own `America/New_York` 9:30 AM - 4 PM ET check for the "Market Open/Closed" UI indicator. The server's `serverActive` flag indicates whether real-time data is flowing, not whether regular market hours are active.

## Symbol Management

- **Global ref counting:** `Map<symbol, Set<clientId>>` — tracks which clients need which symbols.
- **Per-client tracking:** Each client has a `Set<string>` of its subscribed symbols. Duplicate subscribe calls from the same client are idempotent (no double-counting). Unsubscribing from a symbol the client never subscribed to is a no-op.
- When a client subscribes to AAPL and it's already tracked globally → just add client to the set, no new Finnhub subscription needed.
- When last client for a symbol disconnects → unsubscribe from Finnhub.
- **Global cap:** 50 symbols (Finnhub limit). If at cap and new symbol requested, reject with error message.
- **Per-client cap:** 30 symbols max. Prevents a single client from monopolizing the global pool.
- Symbols are normalized to uppercase.

## Authentication

- Shared API key (`WS_API_KEY` env var).
- Client must send `auth` message as the first message within 5 seconds of connecting.
- If no auth or wrong key → server closes connection with code 4001.
- Not per-user auth — stock prices are public data. The key is exposed in the client bundle (`NEXT_PUBLIC_WS_KEY`), so this is a speed bump, not real security.
- **Rate limiting:** Max 100 concurrent connections total, max 5 per IP. Connections beyond the limit are rejected with code 4003.
- **Origin check:** Server validates the `Origin` header on WebSocket upgrade — only allows connections from the app's domain (and localhost in dev).

## Heartbeat

- Server sends WebSocket protocol-level **ping** every 30 seconds.
- If client does not respond with **pong** within 10 seconds, server terminates the connection.
- This detects dead connections through proxies and mobile networks.

## Initial Quote Bootstrap

Finnhub WebSocket only sends trade-level data (`price`, `volume`, `timestamp`). It does NOT send `open`, `previousClose`, `high`, `low`, `change`, or `changePercent`.

**Strategy:** On page load, the frontend fetches the full quote via the existing `/api/prices/batch` REST endpoint (one call). This provides the complete `Quote` object including `previousClose`. After that, the WebSocket streams live `price` updates. The frontend computes `change` and `changePercent` locally:

```
change = wsPrice - previousClose
changePercent = (change / previousClose) * 100
```

The REST `/api/prices/batch` endpoint remains as-is for this bootstrap fetch and as a polling fallback.

## Error Handling

- **Finnhub disconnect:** Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s). Re-subscribe all active symbols after reconnect. Send `{ type: "status", serverActive: true, message: "reconnecting" }` to all clients during reconnection so frontend can show a stale-data indicator.
- **Client disconnect:** Clean up subscriptions, decrement ref counts.
- **Invalid messages:** Ignore silently, don't crash.
- **Finnhub rate limit / error:** Log and continue. Don't propagate to clients.

## Graceful Shutdown

On `SIGTERM` (Railway redeploys):
1. Send close frame to all clients with code 4002 (server restarting).
2. Close Finnhub connection.
3. Exit process.

Client recognizes code 4002 and reconnects immediately (no backoff).

## Project Structure

```
macrolyst-ws/
├── src/
│   ├── index.ts          # Entry point, HTTP health check + WS server
│   ├── finnhub.ts        # Finnhub WebSocket client, reconnect logic
│   ├── clients.ts        # Client connection manager, auth, ref counting
│   ├── market-hours.ts   # 6 AM - 6 PM CST schedule check
│   └── config.ts         # Env vars, constants
├── package.json
├── tsconfig.json
├── Dockerfile            # Node.js 20 alpine, multi-stage build
├── .env.example
└── .gitignore
```

## Environment Variables

```
FINNHUB_API_KEY=...              # Finnhub WebSocket auth
WS_API_KEY=...                   # Shared secret for client auth
PORT=3001                        # Railway assigns this via PORT env var
ALLOWED_ORIGINS=https://macrolyst.com,http://localhost:3000
```

## Frontend Changes (macrolyst app)

New env vars in `.env.local`:
```
NEXT_PUBLIC_WS_URL=wss://macrolyst-ws.up.railway.app
NEXT_PUBLIC_WS_KEY=<shared secret>
```

### Singleton WebSocket connection

The frontend uses a **single shared WebSocket connection** (singleton module), not one per hook instance. Multiple `useLivePrices()` hook instances register their symbols with the shared connection manager. The manager maintains client-side reference counting:

- Hook mounts → registers its symbols with the manager
- Hook unmounts → unregisters its symbols
- Manager diffs the aggregate symbol set and sends `subscribe`/`unsubscribe` delta messages to the server

### Two-phase price loading

1. **Bootstrap:** On mount, fetch full quotes via existing `/api/prices/batch` REST endpoint. This provides `previousClose`, `open`, `high`, `low` for computing change values.
2. **Stream:** WebSocket sends live `price` updates. Frontend overlays the latest price onto the bootstrapped quote and computes `change`/`changePercent` from `previousClose`.

### Fallback to polling

- If WebSocket connection fails 3 times within 60 seconds → fall back to 30s polling via `/api/prices/batch`.
- While polling, attempt to re-establish WebSocket every 5 minutes.
- If WebSocket reconnects successfully → stop polling, resume streaming.

### Subscription updates

- When user navigates (e.g., opens a different stock in trade modal), the hook registers new symbols and unregisters old ones. The singleton manager sends the delta.
- When user adds/removes watchlist items, the hook's symbol list changes and triggers a re-registration.

No changes to existing API routes — they remain as fallback.

## Logging

- Use `pino` for structured JSON logging (Railway log viewer compatible).
- Log levels: info, warn, error.
- Key events logged at info: client connect/disconnect, auth success/failure, Finnhub connect/disconnect/reconnect, symbol subscribe/unsubscribe.
- Errors logged at error: Finnhub failures, unexpected exceptions.
- Periodic stats (every 5 min): active client count, active symbol count, messages relayed.

## Deployment

- **Platform:** Railway Hobby plan ($5/month)
- **Runtime:** Node.js 20 via Dockerfile
- **Always-on:** Serverless mode disabled (default)
- **Health check:** HTTP GET `/health` returns 200
- **Restart policy:** Railway default (auto-restart on crash)

## Cost Estimate

- ~0.25 vCPU, ~256 MB RAM during market hours (12 hrs/day, 5 days/week)
- Near-zero off-hours (server idle, no Finnhub connection)
- Estimated **$3-5/month** on Railway Hobby plan
