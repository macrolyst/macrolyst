const features = [
  {
    tag: "01",
    title: "Market Intelligence",
    desc: "Daily S&P 500 analysis powered by real data. Composite scoring weights analyst targets, technical indicators, momentum, volume signals, and news sentiment into a single actionable score.",
    highlights: ["RSI, MACD, Bollinger Bands", "Analyst price targets", "News sentiment scoring"],
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    tag: "02",
    title: "Real-Time Market Data",
    desc: "Live stock prices streamed via WebSocket during market hours. Live charts, trending tickers, and real-time portfolio updates. No delays, no refreshing.",
    highlights: ["WebSocket price streaming", "Live intraday charts", "Trending tickers from Yahoo"],
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    tag: "03",
    title: "Market Screeners",
    desc: "Discover opportunities with live market screeners. Most Active by volume, top Gainers and Losers, Most Shorted stocks, and Undervalued Large Caps -- all refreshed every 15 minutes.",
    highlights: ["Most Active stocks", "Gainers & Losers", "Most Shorted & Undervalued"],
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    tag: "04",
    title: "Paper Trading Engine",
    desc: "Trade with $100,000 in simulated capital. Market orders, limit orders, and stop-losses. Real prices with slippage simulation, full P&L tracking, and portfolio performance charts.",
    highlights: ["Limit orders & stop-loss", "Real-time execution", "Portfolio allocation chart"],
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    tag: "05",
    title: "Technical Scanners",
    desc: "Six specialized scanners run every morning to surface stocks matching specific technical patterns. Stop scrolling charts manually -- let the scanner find setups for you.",
    highlights: ["RSI Oversold (<30)", "MACD Bullish Crossover", "Volume breakout alerts"],
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    tag: "06",
    title: "Earnings & News",
    desc: "Live market news feed from Finnhub updated throughout the day. Earnings calendar with beat/miss analysis. Hourly catalyst timeline showing what moved the market yesterday.",
    highlights: ["Live news feed", "Earnings beat/miss tracking", "Hourly catalyst timeline"],
    icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">Features</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight">
            Everything to analyze,<br />trade, and discover.
          </h2>
          <p className="mt-4 text-(--text-secondary) max-w-lg mx-auto">
            Built for traders who want data-driven decisions without the noise.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.tag} className="card-glow p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-(--accent)/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-(--accent)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-mono text-(--accent) tracking-wider">{f.tag}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 font-(family-name:--font-source-serif)">{f.title}</h3>
              <p className="text-sm text-(--text-secondary) leading-relaxed mb-4 flex-1">{f.desc}</p>
              <ul className="space-y-1.5">
                {f.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs text-(--text-secondary)">
                    <svg className="w-3.5 h-3.5 text-(--up) shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
