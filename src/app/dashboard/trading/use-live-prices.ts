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
  const fetchPrices = useCallback(async (retries = 2) => {
    const syms = symbolsRef.current;
    if (syms.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/prices/batch?symbols=${syms.join(",")}`);
      if (!res.ok) throw new Error("fetch failed");
      const quotes: Quote[] = await res.json();
      setPrices((prev) => {
        const next = new Map(prev);
        for (const q of quotes) {
          next.set(q.symbol, q);
        }
        return next;
      });
    } catch {
      if (retries > 0) {
        setTimeout(() => fetchPrices(retries - 1), 2000);
        return;
      }
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
          const next = new Map(prev);
          if (existing) {
            next.set(symbol, {
              ...existing,
              price,
              change: price - existing.previousClose,
              changePercent: existing.previousClose
                ? ((price - existing.previousClose) / existing.previousClose) * 100
                : 0,
              timestamp,
            });
          } else {
            // No REST data yet — store what we have from WebSocket
            next.set(symbol, {
              symbol,
              price,
              change: 0,
              changePercent: 0,
              high: price,
              low: price,
              open: price,
              previousClose: price,
              timestamp,
            });
          }
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
