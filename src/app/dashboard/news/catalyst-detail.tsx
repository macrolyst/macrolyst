"use client";

import type { CatalystTimelineData } from "@/lib/db/queries";
import { CatalystChart } from "@/components/charts/catalyst-chart";
import { ChangeBadge } from "@/components/ui/change-badge";
import { formatCurrency } from "@/lib/format";

export function CatalystDetail({ catalyst }: { catalyst: CatalystTimelineData }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white font-(family-name:--font-source-serif)">
          SPY Intraday - {catalyst.date}
        </p>
        <div className="text-right">
          <ChangeBadge value={catalyst.dayChangePct} className="text-lg font-bold" />
          <p className="text-xs text-(--text-secondary)">
            {formatCurrency(catalyst.open)} → {formatCurrency(catalyst.close)}
          </p>
        </div>
      </div>

      {catalyst.hours.length > 0 && <CatalystChart hours={catalyst.hours} />}

      {catalyst.narrative && (
        <p className="text-sm text-(--text-secondary) mt-4 leading-relaxed">{catalyst.narrative}</p>
      )}

      <div className="mt-6 space-y-0">
        {catalyst.hours.map((hour, i) => (
          <div
            key={i}
            className={`flex gap-4 py-3 border-t border-(--border) ${
              hour.significant ? "bg-(--surface-2)/20" : ""
            }`}
          >
            <div className="shrink-0 w-14">
              <span className="text-xs font-mono text-(--text-secondary)">{hour.time}</span>
              {hour.significant && (
                <span className="block w-1.5 h-1.5 rounded-full bg-(--gold) mt-1" title="Significant move" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-(--text-secondary)">
                  {formatCurrency(hour.open)} → {formatCurrency(hour.close)}
                </span>
                <ChangeBadge value={hour.hourlyChange} className="text-xs" />
                {hour.volume && (
                  <span className="text-(--text-secondary)/50">{(hour.volume / 1e6).toFixed(1)}M vol</span>
                )}
              </div>
              {hour.news.length > 0 && (
                <div className="mt-1 space-y-1">
                  {hour.news.map((n, j) => (
                    <a
                      key={j}
                      href={n.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-(--text-primary) hover:text-(--accent) transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-(--accent) shrink-0" />
                      <span className="truncate">{n.headline}</span>
                      {n.source && <span className="text-(--text-secondary) shrink-0">({n.source})</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
