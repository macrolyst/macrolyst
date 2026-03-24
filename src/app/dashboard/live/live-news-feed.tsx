"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Article = {
  id: number;
  headline: string;
  source: string;
  url: string;
  summary: string;
  image: string;
  datetime: number;
  category: string;
  related: string;
};

type Headline = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  timestamp: number;
};

type FmpArticle = {
  title: string;
  date: string;
  tickers: string;
  image: string;
  link: string;
  author: string;
  site: string;
};

const POLL_INTERVAL = 5 * 60 * 1000;

function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LiveNewsFeed() {
  const [tab, setTab] = useState<"market" | "headlines" | "analysis">("market");
  const [articles, setArticles] = useState<Article[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [analysis, setAnalysis] = useState<FmpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [marketRes, headlineRes, analysisRes] = await Promise.all([
        fetch("/api/news/live"),
        fetch("/api/news/headlines"),
        fetch("/api/news/analysis"),
      ]);
      if (marketRes.ok) setArticles(await marketRes.json());
      if (headlineRes.ok) setHeadlines(await headlineRes.json());
      if (analysisRes.ok) setAnalysis(await analysisRes.json());
      setLastFetched(new Date());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(tickInterval);
    };
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs + status */}
      {/* Tabs */}
      <div className="flex justify-center">
        <div className="flex gap-2 bg-(--surface-2) rounded-lg p-1">
          <button
            onClick={() => setTab("market")}
            className={`px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
              tab === "market" ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary)"
            }`}
          >
            Market News
          </button>
          <button
            onClick={() => setTab("headlines")}
            className={`px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
              tab === "headlines" ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary)"
            }`}
          >
            Headlines
          </button>
          <button
            onClick={() => setTab("analysis")}
            className={`px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
              tab === "analysis" ? "bg-(--accent)/15 text-(--accent)" : "text-(--text-secondary)"
            }`}
          >
            Analysis
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-(--up) pulse-dot" />
          <span className="text-xs text-(--text-secondary)">Live Feed</span>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-[10px] text-(--text-secondary)/60">
              Updated {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button onClick={fetchAll} className="text-[10px] text-(--accent) hover:underline cursor-pointer">Refresh</button>
        </div>
      </div>

      {/* Market News tab (Finnhub) */}
      {tab === "market" && (
        articles.length === 0 ? (
          <div className="card-glow p-8 text-center">
            <p className="text-sm text-(--text-secondary)">No market news available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-glow p-4 hover:bg-white/[0.02] transition-colors group flex flex-col"
              >
                {article.image && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-(--surface-2) mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-white group-hover:text-(--accent) transition-colors line-clamp-2">
                  {article.headline}
                </h3>
                {article.summary && (
                  <p className="text-xs text-(--text-secondary) mt-1.5 line-clamp-2 flex-1">{article.summary}</p>
                )}
                <div className="flex items-center flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-(--border)">
                  <span className="text-[10px] font-medium text-(--accent)/80">{article.source}</span>
                  <span className="text-[10px] text-(--text-secondary)/50">{timeAgo(article.datetime)}</span>
                  {article.related && article.related.split(",").slice(0, 2).map((ticker) => (
                    <span key={ticker} className="text-[10px] px-1.5 py-0.5 rounded bg-(--surface-3) text-(--text-secondary)">
                      {ticker.trim()}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {/* Headlines tab (Google News RSS) */}
      {tab === "headlines" && (
        headlines.length === 0 ? (
          <div className="card-glow p-8 text-center">
            <p className="text-sm text-(--text-secondary)">No headlines available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headlines.map((h, i) => (
              <a
                key={i}
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="card-glow p-4 hover:bg-white/[0.02] transition-colors group flex flex-col"
              >
                <h3 className="text-sm font-semibold text-white group-hover:text-(--accent) transition-colors line-clamp-2 flex-1">
                  {h.title}
                </h3>
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-(--border)">
                  <span className="text-[10px] font-medium text-(--accent)/80">{h.source}</span>
                  <span className="text-[10px] text-(--text-secondary)/50">{timeAgo(h.timestamp)}</span>
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {/* Analysis tab (FMP Articles) */}
      {tab === "analysis" && (
        analysis.length === 0 ? (
          <div className="card-glow p-8 text-center">
            <p className="text-sm text-(--text-secondary)">No analysis articles available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.map((a, i) => (
              <a
                key={i}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="card-glow p-4 hover:bg-white/[0.02] transition-colors group flex flex-col"
              >
                {a.image && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-(--surface-2) mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-white group-hover:text-(--accent) transition-colors line-clamp-2 flex-1">
                  {a.title}
                </h3>
                <div className="flex items-center flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-(--border)">
                  <span className="text-[10px] font-medium text-(--accent)/80">{a.author}</span>
                  <span className="text-[10px] text-(--text-secondary)/50">{timeAgo(new Date(a.date).getTime() / 1000)}</span>
                  {a.tickers && a.tickers.split(",").slice(0, 2).map((ticker) => (
                    <span key={ticker} className="text-[10px] px-1.5 py-0.5 rounded bg-(--surface-3) text-(--text-secondary)">
                      {ticker.trim().split(":").pop()}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )
      )}
    </div>
  );
}
