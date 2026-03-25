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
    let cancelled = false;
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((serverSections: Section[]) => {
        if (cancelled) return;
        const result: Section[] = [];
        // Pipeline Top Picks first (already on server, no API call)
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
        result.push(...serverSections);
        setSections(result);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
