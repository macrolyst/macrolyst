"use client";

import { useState, useMemo } from "react";
import type { EarningsEvent } from "@/lib/db/queries";
import { formatPercent, formatDate, formatCompactNumber } from "@/lib/format";
import { ChangeBadge } from "@/components/ui/change-badge";

export function EarningsView({ events }: { events: EarningsEvent[] }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const upcoming = useMemo(
    () => events
      .filter((e) => e.type === "upcoming")
      .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "")),
    [events]
  );

  const past = useMemo(
    () => events
      .filter((e) => e.type === "past")
      .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")),
    [events]
  );

  const active = tab === "upcoming" ? upcoming : past;

  const stats = useMemo(() => {
    const withSurprise = past.filter((e) => e.surprisePct !== null);
    const beats = withSurprise.filter((e) => (e.surprisePct ?? 0) > 0);
    const misses = withSurprise.filter((e) => (e.surprisePct ?? 0) < 0);
    return {
      total: withSurprise.length,
      beats: beats.length,
      misses: misses.length,
      beatRate: withSurprise.length > 0 ? (beats.length / withSurprise.length) * 100 : null,
      avgBeatSurprise: beats.length > 0
        ? beats.reduce((sum, e) => sum + (e.surprisePct ?? 0), 0) / beats.length
        : null,
    };
  }, [past]);

  return (
    <div>
      <div className="flex gap-4 mb-6">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${
              tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past Results (${past.length})`}
          </button>
        ))}
      </div>

      {tab === "past" && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Beat Rate</p>
            <p className="text-lg font-bold text-(--accent)">{stats.beatRate?.toFixed(0)}%</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Beats</p>
            <p className="text-lg font-bold text-(--up)">{stats.beats}</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Misses</p>
            <p className="text-lg font-bold text-(--down)">{stats.misses}</p>
          </div>
          <div className="bg-(--surface-2)/50 rounded-lg p-3">
            <p className="text-xs text-(--text-secondary)">Avg Beat Surprise</p>
            <p className="text-lg font-bold text-(--up)">{stats.avgBeatSurprise ? `+${stats.avgBeatSurprise.toFixed(1)}%` : "--"}</p>
          </div>
        </div>
      )}

      {active.length > 0 ? (
        <div className="divide-y divide-(--border)">
          {Array.from(
            active.reduce((map, event) => {
              const date = event.eventDate ?? "Unknown";
              const list = map.get(date) || [];
              list.push(event);
              map.set(date, list);
              return map;
            }, new Map<string, EarningsEvent[]>())
          ).map(([date, dateEvents]) => (
            <div key={date} className="py-4">
              <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {dateEvents.map((event, i) => (
                  <div
                    key={`${event.ticker}-${i}`}
                    className="flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-(--surface-2)/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{event.ticker}</span>
                        <span className="text-xs text-(--text-secondary) truncate">{event.name}</span>
                        {event.hour && (
                          <span className="text-[10px] text-(--text-secondary)/60 px-1.5 py-0.5 rounded bg-(--surface-2)">
                            {event.hour === "bmo" ? "Before Open" : event.hour === "amc" ? "After Close" : event.hour}
                          </span>
                        )}
                      </div>
                    </div>
                    {tab === "upcoming" ? (
                      <div className="text-right shrink-0">
                        {event.estimateEps !== null && (
                          <p className="text-xs text-(--text-secondary)">Est: ${event.estimateEps.toFixed(2)}</p>
                        )}
                        {event.revenueEstimate !== null && (
                          <p className="text-[10px] text-(--text-secondary)/60">Rev est: {formatCompactNumber(event.revenueEstimate)}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            {event.estimateEps !== null && (
                              <span className="text-xs text-(--text-secondary)">Est: ${event.estimateEps.toFixed(2)}</span>
                            )}
                            {event.actualEps !== null && (
                              <span className="text-xs text-white">Act: ${event.actualEps.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        {event.surprisePct !== null && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              event.surprisePct > 0
                                ? "bg-(--up)/15 text-(--up)"
                                : event.surprisePct < 0
                                ? "bg-(--down)/15 text-(--down)"
                                : "bg-(--surface-2) text-(--text-secondary)"
                            }`}
                          >
                            {event.surprisePct > 0 ? "Beat" : event.surprisePct < 0 ? "Miss" : "Meet"}{" "}
                            {formatPercent(event.surprisePct)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--text-secondary) py-8 text-center">
          {tab === "upcoming" ? "No upcoming earnings in the next 7 days." : "No past earnings data."}
        </p>
      )}
    </div>
  );
}
