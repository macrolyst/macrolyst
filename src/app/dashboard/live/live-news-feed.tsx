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

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LiveNewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [, setTick] = useState(0); // Force re-render for "time ago" updates
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news/live");
      if (!res.ok) return;
      const data: Article[] = await res.json();
      setArticles(data);
      setLastFetched(new Date());
    } catch {
      // Silently fail, will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    intervalRef.current = setInterval(fetchNews, POLL_INTERVAL);

    // Update "time ago" labels every minute
    const tickInterval = setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(tickInterval);
    };
  }, [fetchNews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-(--up) pulse-dot" />
          <span className="text-xs text-(--text-secondary)">
            Live Feed — {articles.length} articles
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-[10px] text-(--text-secondary)/60">
              Updated {lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchNews}
            className="text-[10px] text-(--accent) hover:underline cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <div className="card-glow p-8 text-center">
          <p className="text-sm text-(--text-secondary)">No news available right now. Check back later.</p>
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
      )}
    </div>
  );
}
