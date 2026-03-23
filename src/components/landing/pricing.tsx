import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28 px-6 border-t border-(--border)">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">Pricing</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight">
            Free. No catch.
          </h2>
          <p className="mt-4 text-(--text-secondary) max-w-lg mx-auto">
            All features included. No premium tier. No credit card required.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative">
            <div className="absolute -inset-px bg-linear-to-b from-(--accent)/30 to-(--accent)/5 rounded-2xl" />
            <div className="relative card-glow p-8 sm:p-10 rounded-2xl">
              <div className="text-center mb-8">
                <p className="text-sm font-medium text-(--accent) mb-2">Everything Plan</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-white font-(family-name:--font-source-serif)">$0</span>
                  <span className="text-(--text-secondary)">/forever</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "Daily S&P 500 analysis (500+ stocks)",
                  "Real-time WebSocket price streaming",
                  "Market screeners (Most Active, Gainers, Losers, Shorted, Undervalued)",
                  "Technical scanners (RSI, MACD, Bollinger, Volume)",
                  "Paper trading with $100k simulated capital",
                  "Limit orders and stop-loss orders",
                  "Live news feed and trending tickers",
                  "Earnings calendar and impact analysis",
                  "Hour-by-hour catalyst timeline",
                  "Historical backtest and accuracy tracking",
                  "Live intraday stock charts",
                  "Portfolio allocation breakdown",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <svg className="w-4 h-4 text-(--up) mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-(--text-secondary)">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/sign-up"
                className="flex items-center justify-center gap-2 w-full bg-(--accent) text-(--surface-0) px-6 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
