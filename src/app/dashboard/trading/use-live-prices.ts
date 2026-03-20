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

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, Quote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);
  const symbolsRef = useRef(symbols);
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

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }

    const checkMarket = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = et.getDay();
      const mins = et.getHours() * 60 + et.getMinutes();
      setMarketOpen(day > 0 && day < 6 && mins >= 570 && mins < 960);
    };
    checkMarket();
    fetchPrices();

    const interval = setInterval(() => {
      checkMarket();
      fetchPrices();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, fetchPrices]);

  return { prices, loading, marketOpen };
}
