# macrolyst-ws Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WebSocket relay server that maintains a single Finnhub WebSocket connection and fans out real-time stock prices to browser clients, replacing the current 30s polling approach.

**Architecture:** Standalone Node.js TypeScript server (`macrolyst-ws`) deployed on Railway. Connects to Finnhub WebSocket during market hours (6 AM - 6 PM CST weekdays), manages per-client symbol subscriptions via reference counting, relays price updates to browsers. Frontend gets a singleton WebSocket connection manager that replaces polling in `useLivePrices()` with WebSocket streaming + REST bootstrap for full quote data.

**Tech Stack:** Node.js 20, TypeScript, `ws` library, `pino` logger, Docker, Railway

**Spec:** `docs/specs/2026-03-23-macrolyst-ws-design.md`

---

## Part 1: macrolyst-ws Server (new repo)

All files in this part are created at `C:\Users\vasti\OneDrive\Desktop\extra\macrolyst-ws`.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `Dockerfile`

- [ ] **Step 1: Create project directory and initialize**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra
mkdir macrolyst-ws
cd macrolyst-ws
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "macrolyst-ws",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "ws": "^8.18.0",
    "pino": "^9.6.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.14",
    "@types/node": "^20",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 5: Create .env.example**

```
FINNHUB_API_KEY=
WS_API_KEY=
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
```

- [ ] **Step 6: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: project scaffold with package.json, tsconfig, Dockerfile"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create src/config.ts**

```typescript
export const config = {
  finnhubApiKey: process.env.FINNHUB_API_KEY || "",
  wsApiKey: process.env.WS_API_KEY || "",
  port: parseInt(process.env.PORT || "3001", 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),

  // Market hours: 6 AM - 6 PM CST (America/Chicago), weekdays
  marketStartHour: 6,
  marketEndHour: 18,
  timezone: "America/Chicago",

  // Limits
  maxGlobalSymbols: 50,
  maxClientSymbols: 30,
  maxConnections: 100,
  maxConnectionsPerIp: 5,

  // Timing
  authTimeoutMs: 5000,
  pingIntervalMs: 30000,
  pongTimeoutMs: 10000,
  finnhubReconnectBaseMs: 1000,
  finnhubReconnectMaxMs: 30000,
  scheduleCheckIntervalMs: 60000,
  statsIntervalMs: 300000, // 5 min
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config module with env vars and constants"
```

---

### Task 3: Market Hours Module

**Files:**
- Create: `src/market-hours.ts`

- [ ] **Step 1: Create src/market-hours.ts**

```typescript
import { config } from "./config.js";

export function isServerActiveWindow(): boolean {
  const now = new Date();
  const chicagoTime = new Date(
    now.toLocaleString("en-US", { timeZone: config.timezone })
  );
  const day = chicagoTime.getDay();
  if (day === 0 || day === 6) return false;
  const hour = chicagoTime.getHours();
  return hour >= config.marketStartHour && hour < config.marketEndHour;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/market-hours.ts
git commit -m "feat: add market hours check (6AM-6PM CST weekdays)"
```

---

### Task 4: Finnhub WebSocket Client

**Files:**
- Create: `src/finnhub.ts`

- [ ] **Step 1: Create src/finnhub.ts**

This module manages the single persistent connection to Finnhub's WebSocket API. It handles connecting, disconnecting, subscribing/unsubscribing symbols, auto-reconnect with exponential backoff, and emitting price updates via a callback.

```typescript
import WebSocket from "ws";
import pino from "pino";
import { config } from "./config.js";

const log = pino({ name: "finnhub" });

export type PriceUpdate = {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
};

type OnPriceCallback = (update: PriceUpdate) => void;
type OnStatusCallback = (connected: boolean) => void;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = false;
let onPrice: OnPriceCallback = () => {};
let onStatus: OnStatusCallback = () => {};

const subscribedSymbols = new Set<string>();

export function setCallbacks(priceCb: OnPriceCallback, statusCb: OnStatusCallback) {
  onPrice = priceCb;
  onStatus = statusCb;
}

export function connect() {
  if (ws) return;
  if (!config.finnhubApiKey) {
    log.error("FINNHUB_API_KEY not set, cannot connect");
    return;
  }

  shouldReconnect = true;
  log.info("Connecting to Finnhub WebSocket...");
  ws = new WebSocket(`wss://ws.finnhub.io?token=${config.finnhubApiKey}`);

  ws.on("open", () => {
    log.info("Finnhub WebSocket connected");
    reconnectAttempts = 0;
    onStatus(true);
    // Re-subscribe all active symbols
    for (const symbol of subscribedSymbols) {
      sendSubscribe(symbol);
    }
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "trade" && Array.isArray(msg.data)) {
        // Finnhub sends batched trades — take the latest per symbol
        const latest = new Map<string, PriceUpdate>();
        for (const trade of msg.data) {
          latest.set(trade.s, {
            symbol: trade.s,
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
          });
        }
        for (const update of latest.values()) {
          onPrice(update);
        }
      }
    } catch {
      // Ignore parse errors
    }
  });

  ws.on("close", () => {
    log.warn("Finnhub WebSocket closed");
    ws = null;
    onStatus(false);
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    log.error({ err: err.message }, "Finnhub WebSocket error");
    ws?.close();
  });
}

export function disconnect() {
  shouldReconnect = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (ws) {
    ws.removeAllListeners();
    ws.close();
    ws = null;
    log.info("Finnhub WebSocket disconnected");
  }
}

export function subscribe(symbol: string) {
  subscribedSymbols.add(symbol);
  if (ws?.readyState === WebSocket.OPEN) {
    sendSubscribe(symbol);
  }
}

export function unsubscribe(symbol: string) {
  subscribedSymbols.delete(symbol);
  if (ws?.readyState === WebSocket.OPEN) {
    sendUnsubscribe(symbol);
  }
}

export function getSubscribedCount(): number {
  return subscribedSymbols.size;
}

function sendSubscribe(symbol: string) {
  ws?.send(JSON.stringify({ type: "subscribe", symbol }));
}

function sendUnsubscribe(symbol: string) {
  ws?.send(JSON.stringify({ type: "unsubscribe", symbol }));
}

function scheduleReconnect() {
  if (!shouldReconnect) return;
  const delay = Math.min(
    config.finnhubReconnectBaseMs * 2 ** reconnectAttempts,
    config.finnhubReconnectMaxMs
  );
  reconnectAttempts++;
  log.info({ delay, attempt: reconnectAttempts }, "Scheduling Finnhub reconnect");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/finnhub.ts
git commit -m "feat: Finnhub WebSocket client with reconnect and batching"
```

---

### Task 5: Client Connection Manager

**Files:**
- Create: `src/clients.ts`

- [ ] **Step 1: Create src/clients.ts**

This module manages all browser client WebSocket connections. It handles auth, per-client symbol tracking, global reference counting, and relaying price updates to the right clients.

```typescript
import { WebSocket } from "ws";
import pino from "pino";
import { config } from "./config.js";
import * as finnhub from "./finnhub.js";

const log = pino({ name: "clients" });

type Client = {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
  symbols: Set<string>;
  alive: boolean;
  ip: string;
};

const clients = new Map<string, Client>();
// Global ref count: symbol → set of client IDs
const symbolRefs = new Map<string, Set<string>>();
// IP connection count
const ipCount = new Map<string, number>();

let clientIdCounter = 0;

export function getClientCount(): number {
  return clients.size;
}

export function getSymbolCount(): number {
  return symbolRefs.size;
}

export function canAcceptConnection(ip: string): { ok: boolean; reason?: string } {
  if (clients.size >= config.maxConnections) {
    return { ok: false, reason: "max connections reached" };
  }
  const count = ipCount.get(ip) || 0;
  if (count >= config.maxConnectionsPerIp) {
    return { ok: false, reason: "max connections per IP reached" };
  }
  return { ok: true };
}

export function addClient(ws: WebSocket, ip: string): string {
  const id = `c${++clientIdCounter}`;
  const client: Client = { id, ws, authenticated: false, symbols: new Set(), alive: true, ip };
  clients.set(id, client);
  ipCount.set(ip, (ipCount.get(ip) || 0) + 1);

  // Auth timeout
  setTimeout(() => {
    const c = clients.get(id);
    if (c && !c.authenticated) {
      log.warn({ clientId: id }, "Auth timeout, closing connection");
      c.ws.close(4001, "auth timeout");
      removeClient(id);
    }
  }, config.authTimeoutMs);

  log.info({ clientId: id, ip }, "Client connected");
  return id;
}

export function removeClient(id: string) {
  const client = clients.get(id);
  if (!client) return;

  // Unsubscribe all symbols for this client
  for (const symbol of client.symbols) {
    removeSymbolRef(symbol, id);
  }

  const ipC = ipCount.get(client.ip);
  if (ipC !== undefined) {
    if (ipC <= 1) ipCount.delete(client.ip);
    else ipCount.set(client.ip, ipC - 1);
  }

  clients.delete(id);
  log.info({ clientId: id }, "Client disconnected");
}

export function handleMessage(clientId: string, raw: string) {
  const client = clients.get(clientId);
  if (!client) return;

  let msg: { type: string; key?: string; symbols?: string[] };
  try {
    msg = JSON.parse(raw);
  } catch {
    return; // Ignore invalid JSON
  }

  if (!client.authenticated) {
    if (msg.type === "auth" && msg.key === config.wsApiKey) {
      client.authenticated = true;
      send(client.ws, { type: "auth", status: "ok" });
      log.info({ clientId }, "Client authenticated");
    } else if (msg.type === "auth") {
      send(client.ws, { type: "auth", status: "error" });
      client.ws.close(4001, "invalid key");
      removeClient(clientId);
    } else {
      send(client.ws, { type: "error", message: "not authenticated" });
    }
    return;
  }

  switch (msg.type) {
    case "subscribe":
      handleSubscribe(client, msg.symbols || []);
      break;
    case "unsubscribe":
      handleUnsubscribe(client, msg.symbols || []);
      break;
    default:
      break;
  }
}

function handleSubscribe(client: Client, symbols: string[]) {
  const added: string[] = [];
  for (const raw of symbols) {
    const symbol = raw.toUpperCase();
    if (client.symbols.has(symbol)) continue; // Idempotent
    if (client.symbols.size >= config.maxClientSymbols) {
      send(client.ws, { type: "error", message: `per-client limit of ${config.maxClientSymbols} symbols reached` });
      break;
    }
    if (!symbolRefs.has(symbol) && symbolRefs.size >= config.maxGlobalSymbols) {
      send(client.ws, { type: "error", message: `global limit of ${config.maxGlobalSymbols} symbols reached` });
      break;
    }
    client.symbols.add(symbol);
    addSymbolRef(symbol, client.id);
    added.push(symbol);
  }
  if (added.length > 0) {
    send(client.ws, { type: "subscribed", symbols: added });
  }
}

function handleUnsubscribe(client: Client, symbols: string[]) {
  const removed: string[] = [];
  for (const raw of symbols) {
    const symbol = raw.toUpperCase();
    if (!client.symbols.has(symbol)) continue; // No-op
    client.symbols.delete(symbol);
    removeSymbolRef(symbol, client.id);
    removed.push(symbol);
  }
  if (removed.length > 0) {
    send(client.ws, { type: "unsubscribed", symbols: removed });
  }
}

function addSymbolRef(symbol: string, clientId: string) {
  let refs = symbolRefs.get(symbol);
  if (!refs) {
    refs = new Set();
    symbolRefs.set(symbol, refs);
    finnhub.subscribe(symbol);
    log.info({ symbol }, "Subscribed to Finnhub");
  }
  refs.add(clientId);
}

function removeSymbolRef(symbol: string, clientId: string) {
  const refs = symbolRefs.get(symbol);
  if (!refs) return;
  refs.delete(clientId);
  if (refs.size === 0) {
    symbolRefs.delete(symbol);
    finnhub.unsubscribe(symbol);
    log.info({ symbol }, "Unsubscribed from Finnhub");
  }
}

export function broadcastPrice(symbol: string, data: object) {
  const refs = symbolRefs.get(symbol);
  if (!refs) return;
  const msg = JSON.stringify(data);
  for (const clientId of refs) {
    const client = clients.get(clientId);
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

export function broadcastAll(data: object) {
  const msg = JSON.stringify(data);
  for (const client of clients.values()) {
    if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

// Heartbeat: mark client alive on pong, terminate dead clients
export function markAlive(clientId: string) {
  const client = clients.get(clientId);
  if (client) client.alive = true;
}

export function pingAll() {
  for (const [id, client] of clients) {
    if (!client.alive) {
      log.warn({ clientId: id }, "Client failed pong, terminating");
      client.ws.terminate();
      removeClient(id);
      continue;
    }
    client.alive = false;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.ping();
    }
  }
}

export function closeAll(code: number, reason: string) {
  const ids = [...clients.keys()];
  for (const id of ids) {
    const client = clients.get(id);
    if (client) client.ws.close(code, reason);
    removeClient(id);
  }
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/clients.ts
git commit -m "feat: client connection manager with auth, ref counting, heartbeat"
```

---

### Task 6: Server Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```typescript
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import pino from "pino";
import { config } from "./config.js";
import { isServerActiveWindow } from "./market-hours.js";
import * as finnhub from "./finnhub.js";
import * as clients from "./clients.js";

const log = pino({ name: "server" });

// --- HTTP server for health check ---
const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      clients: clients.getClientCount(),
      symbols: clients.getSymbolCount(),
      serverActive: isServerActiveWindow(),
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// --- WebSocket server ---
const wss = new WebSocketServer({
  server,
  verifyClient: (info, cb) => {
    const origin = info.origin || "";
    if (config.allowedOrigins.length > 0 && !config.allowedOrigins.includes(origin)) {
      log.warn({ origin }, "Rejected connection: invalid origin");
      cb(false, 403, "Origin not allowed");
      return;
    }
    const ip = (info.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || info.req.socket.remoteAddress
      || "unknown";
    const check = clients.canAcceptConnection(ip);
    if (!check.ok) {
      log.warn({ ip, reason: check.reason }, "Rejected connection");
      cb(false, 429, check.reason || "rejected");
      return;
    }
    cb(true);
  },
});

wss.on("connection", (ws: WebSocket, req) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";

  const clientId = clients.addClient(ws, ip);

  // Send current server status
  const active = isServerActiveWindow();
  ws.send(JSON.stringify({ type: "status", serverActive: active }));

  ws.on("message", (data) => {
    clients.handleMessage(clientId, data.toString());
  });

  ws.on("pong", () => {
    clients.markAlive(clientId);
  });

  ws.on("close", () => {
    clients.removeClient(clientId);
  });

  ws.on("error", (err) => {
    log.error({ clientId, err: err.message }, "Client WebSocket error");
    clients.removeClient(clientId);
  });
});

// --- Finnhub callbacks ---
finnhub.setCallbacks(
  // On price update from Finnhub
  (update) => {
    clients.broadcastPrice(update.symbol, {
      type: "price",
      symbol: update.symbol,
      price: update.price,
      volume: update.volume,
      timestamp: update.timestamp,
    });
  },
  // On Finnhub connection status change
  (connected) => {
    if (!connected) {
      clients.broadcastAll({
        type: "status",
        serverActive: true,
        message: "reconnecting",
      });
    }
  }
);

// --- Market hours schedule ---
let finnhubConnected = false;

function checkSchedule() {
  const active = isServerActiveWindow();
  if (active && !finnhubConnected) {
    log.info("Market hours active, connecting to Finnhub");
    finnhub.connect();
    finnhubConnected = true;
    clients.broadcastAll({ type: "status", serverActive: true });
  } else if (!active && finnhubConnected) {
    log.info("Market hours ended, disconnecting from Finnhub");
    finnhub.disconnect();
    finnhubConnected = false;
    clients.broadcastAll({ type: "status", serverActive: false });
  }
}

// Check schedule immediately and every minute
checkSchedule();
setInterval(checkSchedule, config.scheduleCheckIntervalMs);

// --- Heartbeat ---
setInterval(() => {
  clients.pingAll();
}, config.pingIntervalMs);

// --- Stats logging ---
setInterval(() => {
  log.info({
    clients: clients.getClientCount(),
    symbols: clients.getSymbolCount(),
    serverActive: finnhubConnected,
  }, "Server stats");
}, config.statsIntervalMs);

// --- Graceful shutdown ---
function shutdown() {
  log.info("Shutting down...");
  clients.closeAll(4002, "server restarting");
  finnhub.disconnect();
  server.close(() => {
    log.info("Server closed");
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => process.exit(0), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- Start ---
server.listen(config.port, () => {
  log.info({ port: config.port }, "macrolyst-ws server started");
});
```

- [ ] **Step 2: Create .env file from .env.example with real values**

Copy `.env.example` to `.env` and fill in `FINNHUB_API_KEY` and `WS_API_KEY` (generate a random string for the WS key).

- [ ] **Step 3: Test locally**

```bash
npm run dev
```

Verify:
- Server starts on port 3001
- `curl http://localhost:3001/health` returns `{"status":"ok",...}`
- If within market hours, logs show "Connecting to Finnhub WebSocket..."

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: server entry point with HTTP health check, WS server, schedule, shutdown"
```

---

### Task 7: GitHub Repo and Railway Deploy

- [ ] **Step 1: Create GitHub repo**

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst-ws
gh auth login   # if not already logged in
```

Create the repo on GitHub under the macrolyst org (or personal account), then:

```bash
git remote add origin https://github.com/<your-org>/macrolyst-ws.git
git push -u origin main
```

- [ ] **Step 2: Deploy to Railway**

1. Go to railway.com, log in, create a new project
2. Connect the `macrolyst-ws` GitHub repo
3. Railway auto-detects Dockerfile
4. Add environment variables in Railway dashboard:
   - `FINNHUB_API_KEY` — same key as pipeline
   - `WS_API_KEY` — the random secret you generated
   - `ALLOWED_ORIGINS` — `https://macrolyst.com,http://localhost:3000`
   - `PORT` is auto-set by Railway
5. Deploy — Railway builds and starts the service
6. Note the public URL (e.g., `macrolyst-ws.up.railway.app`)
7. Verify health check: `curl https://macrolyst-ws.up.railway.app/health`

- [ ] **Step 3: Commit any deployment config changes if needed**

---

## Part 2: Frontend Integration (macrolyst app)

All files in this part are in `C:\Users\vasti\OneDrive\Desktop\extra\macrolyst`.

---

### Task 8: WebSocket Connection Manager (Singleton)

**Files:**
- Create: `src/lib/ws-manager.ts`

- [ ] **Step 1: Create src/lib/ws-manager.ts**

This is a singleton module that manages a single WebSocket connection to macrolyst-ws. Multiple `useLivePrices()` hooks register/unregister their symbols, and the manager sends subscribe/unsubscribe deltas.

```typescript
type PriceListener = (symbol: string, price: number, volume: number, timestamp: number) => void;
type StatusListener = (serverActive: boolean, message?: string) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";
const WS_KEY = process.env.NEXT_PUBLIC_WS_KEY || "";

let ws: WebSocket | null = null;
let authenticated = false;
let connectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let failCount = 0;
let firstFailTime = 0;

// Subscriber tracking: hookId → Set<symbol>
const subscribers = new Map<string, Set<string>>();
// Current active subscriptions on server
const activeSymbols = new Set<string>();

const priceListeners = new Set<PriceListener>();
const statusListeners = new Set<StatusListener>();

let hookIdCounter = 0;

export function isAvailable(): boolean {
  return !!WS_URL && !!WS_KEY;
}

export function addPriceListener(fn: PriceListener) {
  priceListeners.add(fn);
}
export function removePriceListener(fn: PriceListener) {
  priceListeners.delete(fn);
}
export function addStatusListener(fn: StatusListener) {
  statusListeners.add(fn);
}
export function removeStatusListener(fn: StatusListener) {
  statusListeners.delete(fn);
}

export function register(symbols: string[]): string {
  const id = `hook_${++hookIdCounter}`;
  subscribers.set(id, new Set(symbols.map((s) => s.toUpperCase())));
  syncSubscriptions();
  ensureConnected();
  return id;
}

export function update(id: string, symbols: string[]) {
  if (!subscribers.has(id)) return;
  subscribers.set(id, new Set(symbols.map((s) => s.toUpperCase())));
  syncSubscriptions();
}

export function unregister(id: string) {
  subscribers.delete(id);
  syncSubscriptions();
}

function getDesiredSymbols(): Set<string> {
  const all = new Set<string>();
  for (const syms of subscribers.values()) {
    for (const s of syms) all.add(s);
  }
  return all;
}

function syncSubscriptions() {
  if (!ws || !authenticated) return;
  const desired = getDesiredSymbols();

  // Subscribe new symbols
  const toSubscribe = [...desired].filter((s) => !activeSymbols.has(s));
  if (toSubscribe.length > 0) {
    ws.send(JSON.stringify({ type: "subscribe", symbols: toSubscribe }));
    for (const s of toSubscribe) activeSymbols.add(s);
  }

  // Unsubscribe removed symbols
  const toUnsubscribe = [...activeSymbols].filter((s) => !desired.has(s));
  if (toUnsubscribe.length > 0) {
    ws.send(JSON.stringify({ type: "unsubscribe", symbols: toUnsubscribe }));
    for (const s of toUnsubscribe) activeSymbols.delete(s);
  }
}

function ensureConnected() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (!WS_URL || !WS_KEY) return;
  connect();
}

function connect() {
  if (typeof WebSocket === "undefined") return; // SSR guard
  if (ws) {
    ws.close();
    ws = null;
  }
  authenticated = false;
  activeSymbols.clear();

  try {
    ws = new WebSocket(WS_URL);
  } catch {
    handleConnectFailure();
    return;
  }

  ws.onopen = () => {
    connectAttempts = 0;
    ws!.send(JSON.stringify({ type: "auth", key: WS_KEY }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      switch (msg.type) {
        case "auth":
          if (msg.status === "ok") {
            authenticated = true;
            failCount = 0;
            syncSubscriptions();
          } else {
            ws?.close();
          }
          break;
        case "price":
          for (const fn of priceListeners) {
            fn(msg.symbol, msg.price, msg.volume, msg.timestamp);
          }
          break;
        case "status":
          for (const fn of statusListeners) {
            fn(msg.serverActive, msg.message);
          }
          break;
        default:
          break;
      }
    } catch {
      // Ignore parse errors
    }
  };

  ws.onclose = (event) => {
    authenticated = false;
    activeSymbols.clear();
    ws = null;

    // Code 4002 = server restarting, reconnect immediately
    if (event.code === 4002) {
      connect();
      return;
    }

    handleConnectFailure();
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

function handleConnectFailure() {
  const now = Date.now();
  if (now - firstFailTime > 60000) {
    failCount = 0;
    firstFailTime = now;
  }
  failCount++;

  // If 3 failures within 60s, stop trying (fallback to polling)
  if (failCount >= 3) return;

  const delay = Math.min(1000 * 2 ** connectAttempts, 30000);
  connectAttempts++;
  reconnectTimer = setTimeout(connect, delay);
}

/** Returns true if WS is connected and authenticated */
export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN && authenticated;
}

/** Check if we've given up reconnecting (3 failures in 60s) */
export function isFallbackMode(): boolean {
  return failCount >= 3;
}

/** Attempt to re-establish after fallback. Called periodically. */
export function retryConnection() {
  failCount = 0;
  connectAttempts = 0;
  firstFailTime = 0;
  ensureConnected();
}

// Cleanup
export function destroy() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) ws.close();
  ws = null;
  authenticated = false;
  activeSymbols.clear();
  subscribers.clear();
  priceListeners.clear();
  statusListeners.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ws-manager.ts
git commit -m "feat: singleton WebSocket connection manager for real-time prices"
```

---

### Task 9: Update useLivePrices Hook

**Files:**
- Modify: `src/app/dashboard/trading/use-live-prices.ts`

- [ ] **Step 1: Rewrite use-live-prices.ts**

Replace the polling-only hook with a WebSocket-primary + polling-fallback hook. The hook registers with the singleton ws-manager, receives live price updates, and falls back to polling if WebSocket is unavailable.

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as wsManager from "@/lib/ws-manager";

export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

const POLL_INTERVAL = 30000;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
const WS_RETRY_INTERVAL = 5 * 60 * 1000; // Retry WS every 5 min while polling

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const symbolsRef = useRef(symbols);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registrationRef = useRef<string | null>(null);
  const usingWsRef = useRef(false);
  symbolsRef.current = symbols;

  // Bootstrap: fetch full quotes via REST (provides previousClose, open, high, low)
  const fetchPrices = useCallback(async () => {
    const syms = symbolsRef.current;
    if (syms.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/prices/batch?symbols=${syms.join(",")}`);
      if (!res.ok) return;
      const quotes: Quote[] = await res.json();
      setPrices((prev) => {
        const next = new Map(prev);
        for (const q of quotes) {
          next.set(q.symbol, q);
        }
        return next;
      });
    } catch {
      // Silently fail, will retry
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMarket = useCallback(() => {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = et.getDay();
    const mins = et.getHours() * 60 + et.getMinutes();
    setMarketOpen(day > 0 && day < 6 && mins >= 570 && mins < 960);
  }, []);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPaused(false);
    fetchPrices();
    intervalRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPaused(true);
        return;
      }
      checkMarket();
      fetchPrices();
    }, POLL_INTERVAL);
  }, [fetchPrices, checkMarket]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }

    checkMarket();

    // Always fetch full quotes first (bootstrap for previousClose etc.)
    fetchPrices();

    const wsAvailable = wsManager.isAvailable();

    if (wsAvailable) {
      // Register symbols with the WebSocket manager
      registrationRef.current = wsManager.register(symbols);
      usingWsRef.current = true;

      // Listen for price updates
      const onPrice = (symbol: string, price: number, _volume: number, timestamp: number) => {
        setPrices((prev) => {
          const existing = prev.get(symbol);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(symbol, {
            ...existing,
            price,
            change: price - existing.previousClose,
            changePercent: existing.previousClose
              ? ((price - existing.previousClose) / existing.previousClose) * 100
              : 0,
            timestamp,
          });
          return next;
        });
      };

      wsManager.addPriceListener(onPrice);

      // Check if WS enters fallback mode → start polling
      const fallbackCheck = setInterval(() => {
        if (wsManager.isFallbackMode() && usingWsRef.current) {
          usingWsRef.current = false;
          startPolling();
          // Periodically retry WS connection
          wsRetryRef.current = setInterval(() => {
            wsManager.retryConnection();
            // If reconnected, stop polling
            setTimeout(() => {
              if (wsManager.isConnected()) {
                stopPolling();
                if (wsRetryRef.current) clearInterval(wsRetryRef.current);
                wsRetryRef.current = null;
                usingWsRef.current = true;
              }
            }, 3000);
          }, WS_RETRY_INTERVAL);
        }
      }, 5000);

      // Pause/resume on visibility
      const handleVisibility = () => {
        if (document.hidden) {
          // WS connection stays open (server handles idle clients)
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
        } else {
          lastActivityRef.current = Date.now();
          fetchPrices(); // Refresh full quotes on tab focus
          // Check if WS died during sleep/hidden — force reconnect
          if (usingWsRef.current && !wsManager.isConnected()) {
            wsManager.retryConnection();
          }
          if (!usingWsRef.current) startPolling();
        }
      };

      const handleActivity = () => {
        lastActivityRef.current = Date.now();
        if (pausedRef.current) {
          fetchPrices();
          if (!usingWsRef.current) startPolling();
          setPaused(false);
        }
      };

      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("keydown", handleActivity);
      window.addEventListener("touchstart", handleActivity);
      window.addEventListener("scroll", handleActivity);

      return () => {
        clearInterval(fallbackCheck);
        if (wsRetryRef.current) clearInterval(wsRetryRef.current);
        wsManager.removePriceListener(onPrice);
        if (registrationRef.current) {
          wsManager.unregister(registrationRef.current);
          registrationRef.current = null;
        }
        stopPolling();
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("mousemove", handleActivity);
        window.removeEventListener("keydown", handleActivity);
        window.removeEventListener("touchstart", handleActivity);
        window.removeEventListener("scroll", handleActivity);
      };
    } else {
      // No WS configured — pure polling mode (existing behavior)
      startPolling();

      const handleVisibility = () => {
        if (document.hidden) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
        } else {
          lastActivityRef.current = Date.now();
          startPolling();
        }
      };

      const handleActivity = () => {
        lastActivityRef.current = Date.now();
        if (pausedRef.current) startPolling();
      };

      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("keydown", handleActivity);
      window.addEventListener("touchstart", handleActivity);
      window.addEventListener("scroll", handleActivity);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("mousemove", handleActivity);
        window.removeEventListener("keydown", handleActivity);
        window.removeEventListener("touchstart", handleActivity);
        window.removeEventListener("scroll", handleActivity);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { prices, loading, marketOpen, paused };
}
```

- [ ] **Step 2: Verify existing pages still work**

Run `npm run dev` in the macrolyst app. Open the trading and watchlist pages. They should still work with polling (WS env vars not set yet). Once WS env vars are added, it will switch to WebSocket mode.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/trading/use-live-prices.ts
git commit -m "feat: update useLivePrices with WebSocket primary + polling fallback"
```

---

### Task 10: Add WS Environment Variables to macrolyst app

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add env vars to .env.local**

```
NEXT_PUBLIC_WS_URL=wss://macrolyst-ws.up.railway.app
NEXT_PUBLIC_WS_KEY=<the same WS_API_KEY you set on Railway>
```

- [ ] **Step 2: Add env vars to Vercel dashboard**

Go to Vercel project settings → Environment Variables → Add:
- `NEXT_PUBLIC_WS_URL` = `wss://macrolyst-ws.up.railway.app`
- `NEXT_PUBLIC_WS_KEY` = the shared secret

- [ ] **Step 3: Test end-to-end locally**

1. Start macrolyst-ws: `cd macrolyst-ws && npm run dev`
2. Start macrolyst app: `cd macrolyst && npm run dev`
3. Open trading page, check browser DevTools Network → WS tab
4. Verify: WebSocket connection opens, auth succeeds, prices stream in during market hours
5. If outside market hours: verify it falls back to polling gracefully

- [ ] **Step 4: Commit env example update if needed**

---

### Task 11: Deploy and Verify Production

- [ ] **Step 1: Deploy macrolyst app to Vercel**

Push the macrolyst changes to trigger a Vercel deployment, or run:

```bash
cd C:\Users\vasti\OneDrive\Desktop\extra\macrolyst
git push origin master
```

- [ ] **Step 2: Verify production**

1. Open macrolyst.com in browser
2. Go to Trading or Watchlist page
3. Open DevTools → Network → WS tab
4. Verify WebSocket connects to Railway server
5. During market hours: prices should update in real-time (sub-second)
6. Check Railway health: `curl https://macrolyst-ws.up.railway.app/health`

- [ ] **Step 3: Monitor Railway logs**

Check Railway dashboard logs for:
- Client connections/disconnections
- Finnhub connection status
- Stats logging every 5 minutes
