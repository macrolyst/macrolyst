"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  score?: number;
  volume?: string;
  volumeRatio?: number;
};

type Section = {
  title: string;
  stocks: Stock[];
};

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

type TopPick = { ticker: string; name: string; price: number; score: number; change: number };

export function RecommendationsDrawer({
  open,
  onClose,
  onBuy,
  topPicks = [],
}: {
  open: boolean;
  onClose: () => void;
  onBuy: (symbol: string) => void;
  topPicks?: TopPick[];
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      fetch("/api/prices/batch?symbols=SPY,QQQ,DIA,AAPL,MSFT,NVDA,TSLA,GOOGL,AMZN,META").then((r) => r.json()),
      fetch("/api/trending").then((r) => r.json()),
      fetch("/api/volume").then((r) => r.json()),
      fetch("/api/movers?type=day_gainers").then((r) => r.json()),
      fetch("/api/movers?type=day_losers").then((r) => r.json()),
      fetch("/api/movers?type=most_shorted_stocks").then((r) => r.json()),
      fetch("/api/movers?type=undervalued_large_caps").then((r) => r.json()),
    ])
      .then(([, trendingQuotes, volume, gainers, losers, shorted, undervalued]) => {
        const result: Section[] = [];

        // Pipeline Top Picks (from server)
        if (topPicks.length > 0) {
          result.push({
            title: "Top Picks (Pipeline)",
            stocks: topPicks.map((p) => ({
              symbol: p.ticker,
              name: p.name,
              price: p.price,
              changePercent: p.change,
              score: p.score,
            })),
          });
        }

        // Trending
        if (Array.isArray(trendingQuotes) && trendingQuotes.length > 0) {
          result.push({
            title: "Trending",
            stocks: trendingQuotes.slice(0, 5).map((q: { symbol: string; price: number; changePercent: number }) => ({
              symbol: q.symbol,
              name: "",
              price: q.price,
              changePercent: q.changePercent,
            })),
          });
        }

        // Most Active
        const volData = volume?.stocks || volume;
        if (Array.isArray(volData) && volData.length > 0) {
          result.push({
            title: "Most Active",
            stocks: volData.slice(0, 10).map((s: { symbol: string; name: string; price: number; changePercent: number; volume: number; volumeRatio: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              changePercent: s.changePercent,
              volume: formatVolume(s.volume),
              volumeRatio: s.volumeRatio,
            })),
          });
        }

        // Gainers
        const gData = gainers?.stocks || gainers;
        if (Array.isArray(gData) && gData.length > 0) {
          result.push({
            title: "Top Gainers",
            stocks: gData.slice(0, 5).map((s: { symbol: string; name: string; price: number; changePercent: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              changePercent: s.changePercent,
            })),
          });
        }

        // Losers
        const lData = losers?.stocks || losers;
        if (Array.isArray(lData) && lData.length > 0) {
          result.push({
            title: "Top Losers",
            stocks: lData.slice(0, 5).map((s: { symbol: string; name: string; price: number; changePercent: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              changePercent: s.changePercent,
            })),
          });
        }

        // Shorted
        const sData = shorted?.stocks || shorted;
        if (Array.isArray(sData) && sData.length > 0) {
          result.push({
            title: "Most Shorted",
            stocks: sData.slice(0, 5).map((s: { symbol: string; name: string; price: number; changePercent: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              changePercent: s.changePercent,
            })),
          });
        }

        // Undervalued
        const uData = undervalued?.stocks || undervalued;
        if (Array.isArray(uData) && uData.length > 0) {
          result.push({
            title: "Undervalued",
            stocks: uData.slice(0, 5).map((s: { symbol: string; name: string; price: number; changePercent: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              changePercent: s.changePercent,
            })),
          });
        }

        setSections(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, topPicks]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 sm:w-96 bg-(--surface-1) border-l border-(--border) overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-(--border) bg-(--surface-1)">
          <p className="text-sm font-semibold text-white">Recommendations</p>
          <button onClick={onClose} className="text-(--text-secondary) hover:text-white cursor-pointer p-1">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
          </div>
        ) : (
          <div className="py-2">
            {sections.map((section) => (
              <div key={section.title} className="px-4 py-3">
                <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-2">{section.title}</p>
                <div className="space-y-0.5">
                  {section.stocks.map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{s.symbol}</p>
                          {s.name && <p className="text-[9px] text-(--text-secondary) truncate">{s.name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-white">{formatCurrency(s.price)}</span>
                        <ChangeBadge value={s.changePercent} className="text-[10px]" />
                        {s.score !== undefined && s.score > 0 && (
                          <span className="text-[10px] font-bold text-(--accent)">{Math.round(s.score)}</span>
                        )}
                        <button
                          onClick={() => { onBuy(s.symbol); onClose(); }}
                          className="text-[10px] text-(--accent) font-semibold px-2 py-0.5 rounded border border-(--accent)/30 hover:bg-(--accent)/10 cursor-pointer"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
