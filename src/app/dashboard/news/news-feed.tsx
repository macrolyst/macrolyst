"use client";

import { useState, useMemo } from "react";
import type { NewsArticle } from "@/lib/db/queries";

function SentimentDot({ value }: { value: number | null }) {
  if (value === null) return null;
  const color = value > 0.2 ? "#34D399" : value < -0.2 ? "#F87171" : "#94a3b8";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ backgroundColor: color }}
      title={`Sentiment: ${value.toFixed(2)}`}
    />
  );
}

export function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  const [tab, setTab] = useState<"market" | "company">("market");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const filtered = useMemo(() => {
    let list = articles.filter((a) => a.type === tab);
    if (sentimentFilter === "positive") list = list.filter((a) => (a.sentiment ?? 0) > 0.2);
    else if (sentimentFilter === "negative") list = list.filter((a) => (a.sentiment ?? 0) < -0.2);
    else if (sentimentFilter === "neutral") list = list.filter((a) => {
      const s = a.sentiment ?? 0;
      return s >= -0.2 && s <= 0.2;
    });
    return list.sort((a, b) => {
      if (!a.published || !b.published) return 0;
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    });
  }, [articles, tab, sentimentFilter]);

  const grouped = useMemo(() => {
    if (tab !== "company") return null;
    const map = new Map<string, NewsArticle[]>();
    filtered.forEach((a) => {
      if (a.ticker) {
        const list = map.get(a.ticker) || [];
        list.push(a);
        map.set(a.ticker, list);
      }
    });
    return map;
  }, [filtered, tab]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        {(["market", "company"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm pb-2 cursor-pointer transition-colors border-b-2 ${
              tab === t ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
            }`}
          >
            {t === "market" ? "Market News" : "Company News"}
          </button>
        ))}
      </div>

      {/* Sentiment filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "positive", "negative", "neutral"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setSentimentFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
              sentimentFilter === f
                ? "bg-(--accent)/15 text-(--accent) border border-(--accent)/30"
                : "bg-(--surface-2) text-(--text-secondary) border border-transparent hover:bg-(--surface-3)"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* News list */}
      {tab === "market" ? (
        <div className="space-y-1">
          {filtered.map((article, i) => (
            <a
              key={i}
              href={article.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-(--surface-2)/50 transition-colors border-b border-(--border) last:border-0"
            >
              <SentimentDot value={article.sentiment} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-(--text-primary) leading-snug">{article.headline}</p>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && <span className="text-xs text-(--text-secondary)">{article.source}</span>}
                  {article.published && (
                    <span className="text-xs text-(--text-secondary)/50">
                      {new Date(article.published).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                {article.summary && (
                  <p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">{article.summary}</p>
                )}
              </div>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No articles match the current filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped && Array.from(grouped.entries()).map(([ticker, tickerArticles]) => (
            <div key={ticker} className="border-b border-(--border) pb-4 last:border-0">
              <p className="text-sm font-semibold text-white mb-2">{ticker}</p>
              <div className="space-y-2">
                {tickerArticles.map((article, i) => (
                  <a
                    key={i}
                    href={article.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 py-1 hover:bg-(--surface-2)/30 rounded px-2 transition-colors"
                  >
                    <SentimentDot value={article.sentiment} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-(--text-primary)">{article.headline}</p>
                      <span className="text-xs text-(--text-secondary)/50">{article.source}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
          {(!grouped || grouped.size === 0) && (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No company news available.</p>
          )}
        </div>
      )}
    </div>
  );
}
