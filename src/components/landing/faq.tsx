"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Is this financial advice?",
    a: "No. Macrolyst is an educational platform for learning about the stock market. It is not financial advice. All analysis, scores, and recommendations are for educational and informational purposes only. Paper trading uses simulated money with zero real financial risk. Always consult a qualified financial advisor before making real investment decisions.",
  },
  {
    q: "Where does the data come from?",
    a: "We use five public data sources: Yahoo Finance for prices, fundamentals, market screeners, and trending tickers. Finnhub for live news, real-time WebSocket prices, and earnings data. FRED for macro indicators like VIX and Treasury yields. Wikipedia for S&P 500 constituents. Every data point is verifiable.",
  },
  {
    q: "How does the scoring work?",
    a: "Each stock receives a composite score based on five weighted factors: analyst price target upside (30%), technical indicators like RSI and MACD (25%), price momentum (20%), news sentiment (15%), and volume signals (10%). The methodology is fully transparent on the dashboard.",
  },
  {
    q: "What are the market screeners?",
    a: "We offer five live market screeners powered by Yahoo Finance, refreshed every 15 minutes: Most Active (by volume), Top Gainers, Top Losers, Most Shorted stocks, and Undervalued Large Caps. Each shows price, volume, change, and a buy button to practice paper trading.",
  },
  {
    q: "How does paper trading work?",
    a: "You start with $100,000 in simulated capital. You can place market orders (execute immediately at current price), limit orders (buy when price drops to your target, or sell when it rises), and stop-loss orders (sell when price drops below a level to limit losses). Trades execute at real market prices with simulated slippage. No real money is involved.",
  },
  {
    q: "Is it really free?",
    a: "Yes. All features are included at no cost. There is no premium tier, no trial period, and no credit card required. We built this as an educational platform, not a subscription service.",
  },
  {
    q: "How often is the data updated?",
    a: "The analysis pipeline runs every weekday at 1 AM CST, well before market open. During market hours (6 AM - 6 PM CST), stock prices stream in real-time via WebSocket. Live news updates every 5 minutes. Market screeners refresh every 15 minutes.",
  },
  {
    q: "Can I use this on mobile?",
    a: "Yes. The entire application is fully responsive and works on phones, tablets, and desktops. The dashboard uses a slide-out menu on mobile for easy navigation.",
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-glow overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-5 sm:p-6 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-4 pr-4">
          <span className="text-xs font-mono text-(--accent) opacity-40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-sm sm:text-base font-medium text-white group-hover:text-(--accent) transition-colors">
            {q}
          </span>
        </div>
        <div
          className={`w-8 h-8 rounded-full border border-(--border) flex items-center justify-center shrink-0 transition-all duration-200 ${
            open ? "bg-(--accent)/10 border-(--accent)/30 rotate-45" : ""
          }`}
        >
          <svg
            className={`w-4 h-4 transition-colors ${open ? "text-(--accent)" : "text-(--text-secondary)"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="my-4 mx-6 p-4 rounded-lg bg-(--surface-2)/50">
          <p className="text-sm text-(--text-secondary) leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28 px-6 border-t border-(--border)">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-(--accent) mb-4">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-(family-name:--font-source-serif)">
            Common questions
          </h2>
          <p className="mt-3 text-(--text-secondary)">
            Everything you need to know about Macrolyst.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem key={faq.q} {...faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
