"use client";

import { useState, useEffect, useRef } from "react";

type SearchResult = { symbol: string; description: string };

export function TickerSearch({
  onSelect,
  placeholder = "Search ticker or company...",
}: {
  onSelect: (symbol: string, name: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-(--surface-2) text-(--text-primary) border border-(--border) rounded-lg px-3 py-2.5 text-sm focus:border-(--accent)/50 focus:outline-none transition-colors placeholder:text-(--text-secondary)/50"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-(--accent)/30 border-t-(--accent) rounded-full animate-spin" />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-(--surface-2) border border-(--border) rounded-lg shadow-xl shadow-black/30 z-50 max-h-60 overflow-y-auto">
          {results.filter((r, i, arr) => arr.findIndex((x) => x.symbol === r.symbol) === i).map((r) => (
            <button
              key={r.symbol}
              onClick={() => {
                onSelect(r.symbol, r.description);
                setQuery(r.symbol);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-(--surface-3) transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="text-sm font-semibold text-white min-w-[4rem]">{r.symbol}</span>
              <span className="text-xs text-(--text-secondary) truncate">{r.description}</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.length >= 1 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-(--surface-2) border border-(--border) rounded-lg shadow-xl shadow-black/30 z-50 p-3">
          <p className="text-xs text-(--text-secondary) text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
