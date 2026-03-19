const sources = [
  {
    name: "Yahoo Finance",
    what: "Daily prices, fundamentals, analyst targets, 52-week ranges",
    tag: "Prices & Fundamentals",
  },
  {
    name: "Finnhub",
    what: "Market news, company news, sentiment analysis, earnings calendar",
    tag: "News & Sentiment",
  },
  {
    name: "FRED",
    what: "VIX, 10Y/2Y Treasury yields, Federal Funds Rate",
    tag: "Macro Indicators",
  },
  {
    name: "Wikipedia",
    what: "S&P 500 constituent list, sector classifications, industry mappings",
    tag: "Index Data",
  },
  {
    name: "Finnhub WebSocket",
    what: "Live market prices streamed during trading hours for real-time portfolio tracking",
    tag: "Real-Time Prices",
  },
];

export function DataSources() {
  return (
    <section className="py-20 sm:py-28 px-6 border-t border-(--border)">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: source cards */}
          <div className="space-y-3 order-2 lg:order-1">
            {sources.map((s, i) => (
              <div key={s.name} className="card-glow p-5 flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-(--accent)/10 flex items-center justify-center shrink-0 text-sm font-bold text-(--accent) font-(family-name:--font-source-serif)">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--surface-2) text-(--text-secondary)">
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-xs text-(--text-secondary) leading-relaxed">{s.what}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: content */}
          <div className="order-1 lg:order-2">
            <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">Transparency</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight mb-4">
              Real data.<br />No black box.
            </h2>
            <p className="text-(--text-secondary) leading-relaxed mb-8">
              Every data point comes from a verifiable public source. We show you exactly where the data comes from, how scores are calculated, and why each stock is ranked where it is. No proprietary algorithms hidden behind a paywall.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-(--surface-1) border border-(--border)">
                <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">5</p>
                <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider mt-1">Sources</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-(--surface-1) border border-(--border)">
                <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">500+</p>
                <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider mt-1">Stocks</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-(--surface-1) border border-(--border)">
                <p className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">0</p>
                <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider mt-1">Hidden Fees</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
