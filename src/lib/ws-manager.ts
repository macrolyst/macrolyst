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
