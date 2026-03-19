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
    title: "Technical Scanners",
    desc: "Six specialized scanners run every morning to surface stocks matching specific technical patterns. Stop scrolling charts manually -- let the scanner find setups for you.",
    highlights: ["RSI Oversold (<30)", "Golden Cross detection", "Volume breakout alerts"],
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    tag: "03",
    title: "Paper Trading Engine",
    desc: "Trade with $100,000 in simulated capital. Real prices, real execution, zero risk. Build and track your portfolio with full P&L history and performance charts.",
    highlights: ["Real-time market prices", "Full trade history", "Portfolio performance tracking"],
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    tag: "04",
    title: "Challenge Mode",
    desc: "The feature that makes Macrolyst different. Start a challenge, pick your stocks, and compete head-to-head against our algorithm. Track who performs better over 7, 14, or 30 days.",
    highlights: ["You vs. the algorithm", "Daily portfolio snapshots", "Win/loss track record"],
    icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9",
  },
  {
    tag: "05",
    title: "Earnings Intelligence",
    desc: "Upcoming earnings calendar filtered to S&P 500 stocks. Past earnings analysis shows how stocks moved on beats vs misses, so you know what to expect.",
    highlights: ["7-day forward calendar", "Beat/miss price impact", "EPS surprise tracking"],
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    tag: "06",
    title: "What Happened Yesterday",
    desc: "Hour-by-hour breakdown of the previous trading session with SPY price action matched to news events. Understand exactly what moved the market and whether those catalysts carry into today.",
    highlights: ["Hourly SPY price bars", "News-to-price matching", "Market narrative generation"],
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">Features</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight">
            Everything to analyze,<br />trade, and compete.
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
