import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-6 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-200 h-200 bg-(--accent) rounded-full opacity-4 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-(--accent) rounded-full opacity-2 blur-2xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--border) bg-(--surface-1) mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-(--up) pulse-dot" />
            <span className="text-xs text-(--text-secondary) tracking-wide uppercase">
              Analyzing 500+ stocks daily
            </span>
          </div>

          {/* Headline */}
          <h1 className="fade-up fade-up-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold text-white font-(family-name:--font-source-serif) leading-[1.08] tracking-tight">
            Market analysis
            <br />
            <span className="text-(--accent)">you can prove.</span>
          </h1>

          {/* Subheadline */}
          <p className="fade-up fade-up-delay-2 mt-6 text-lg sm:text-xl text-(--text-secondary) leading-relaxed max-w-xl mx-auto">
            AI-powered S&P 500 scoring, technical scanners, and a paper trading engine.
            We show you the picks. You prove if they work.
          </p>

          {/* CTA buttons */}
          <div className="fade-up fade-up-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="group inline-flex items-center gap-2 bg-(--accent) text-(--surface-0) px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all w-full sm:w-auto justify-center"
            >
              Start Trading Free
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-sm font-medium text-(--text-secondary) hover:text-white transition-colors"
            >
              See how it works
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          <p className="fade-up fade-up-delay-4 mt-4 text-xs text-(--text-secondary)/60">
            No credit card required. Free forever.
          </p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="fade-up fade-up-delay-4 mt-16 sm:mt-20 relative">
          <div className="absolute -inset-4 bg-linear-to-b from-(--accent)/10 to-transparent rounded-2xl blur-xl opacity-50" />
          <div className="relative rounded-xl border border-(--border) bg-(--surface-1) overflow-hidden shadow-2xl shadow-black/40">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-(--border) bg-(--surface-0)/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-(--down)/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-(--gold)/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-(--up)/40" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-(--surface-2) text-[10px] text-(--text-secondary)">
                  macrolyst.com/dashboard
                </div>
              </div>
            </div>
            {/* Fake dashboard content */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "S&P 500", value: "+0.84%", color: "var(--up)" },
                  { label: "VIX", value: "18.42", color: "var(--text-primary)" },
                  { label: "Breadth", value: "Bullish", color: "var(--up)" },
                  { label: "10Y Yield", value: "4.21%", color: "var(--gold)" },
                ].map((item) => (
                  <div key={item.label} className="p-3 sm:p-4 rounded-lg bg-(--surface-2)/50 border border-(--border)">
                    <p className="text-[10px] sm:text-xs text-(--text-secondary) uppercase tracking-wider">{item.label}</p>
                    <p className="text-base sm:text-lg font-bold mt-1 font-(family-name:--font-source-serif)" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-32 sm:h-40 rounded-lg bg-(--surface-2)/30 border border-(--border) flex items-end p-4">
                  {/* Fake chart bars */}
                  <div className="flex items-end gap-1 w-full h-full">
                    {[40, 55, 35, 65, 50, 75, 60, 80, 45, 70, 55, 85, 65, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: h > 60 ? 'var(--up)' : 'var(--accent)', opacity: 0.6 }} />
                    ))}
                  </div>
                </div>
                <div className="h-32 sm:h-40 rounded-lg bg-(--surface-2)/30 border border-(--border) p-3 sm:p-4">
                  <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider mb-3">Top Picks</p>
                  {[
                    { ticker: "NVDA", pct: "+3.2%" },
                    { ticker: "AAPL", pct: "+2.1%" },
                    { ticker: "MSFT", pct: "+1.8%" },
                    { ticker: "GOOGL", pct: "+1.5%" },
                  ].map(({ ticker, pct }) => (
                    <div key={ticker} className="flex justify-between items-center py-1">
                      <span className="text-xs font-mono text-white">{ticker}</span>
                      <span className="text-[10px] text-(--up)">{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
