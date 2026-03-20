"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const symbolsRef = useRef(symbols);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  symbolsRef.current = symbols;

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

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPaused(false);
    fetchPrices();
    intervalRef.current = setInterval(() => {
      // Check inactivity
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

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }

    checkMarket();
    startPolling();

    // Pause when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else {
        lastActivityRef.current = Date.now();
        startPolling();
      }
    };

    // Track user activity for inactivity timeout
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (paused) startPolling();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { prices, loading, marketOpen, paused };
}
