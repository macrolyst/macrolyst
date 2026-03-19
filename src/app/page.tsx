import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

const features = [
  {
    tag: "01",
    title: "Market Intelligence",
    desc: "Daily S&P 500 analysis with technical scoring, sector breakdowns, and macro indicators. Know what moved and why.",
  },
  {
    tag: "02",
    title: "Paper Trading",
    desc: "Execute trades with $100k simulated capital. Track your portfolio, P&L, and trade history in real time.",
  },
  {
    tag: "03",
    title: "Challenge Mode",
    desc: "Pick your own stocks and race against our algorithm. 7, 14, or 30-day challenges. See who wins.",
  },
  {
    tag: "04",
    title: "Technical Scanners",
    desc: "RSI oversold, MACD crossovers, golden crosses, volume breakouts. Find setups before they run.",
  },
];

export default async function Home() {
  const session = await auth.getSession();
  if (session?.data?.user) redirect("/dashboard");

  return (
    <div className="noise min-h-screen bg-[var(--surface-0)]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-white font-[family-name:var(--font-source-serif)] tracking-tight">
            Macrolyst
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/sign-in"
              className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="text-sm font-medium bg-[var(--accent)] text-[var(--surface-0)] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent)] rounded-full opacity-[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <div className="fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-1)] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--up)] pulse-dot" />
              <span className="text-xs text-[var(--text-secondary)] tracking-wide uppercase">
                Live market data
              </span>
            </div>

            <h1 className="fade-up fade-up-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold text-white font-[family-name:var(--font-source-serif)] leading-[1.1] tracking-tight">
              Market analysis
              <br />
              <span className="text-[var(--accent)]">you can prove.</span>
            </h1>

            <p className="fade-up fade-up-delay-2 mt-6 text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg">
              S&P 500 scoring, technical scanners, and a paper trading engine.
              We show you the picks. You decide if they work.
            </p>

            <div className="fade-up fade-up-delay-3 mt-10 flex items-center gap-4">
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center gap-2 bg-[var(--accent)] text-[var(--surface-0)] px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
              >
                Start Trading Free
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <span className="text-xs text-[var(--text-secondary)]">
                No credit card required
              </span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="fade-up fade-up-delay-4 mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border)] rounded-xl overflow-hidden border border-[var(--border)]">
            {[
              { value: "500+", label: "Stocks Analyzed" },
              { value: "5", label: "Data Sources" },
              { value: "Daily", label: "Updated Pre-Market" },
              { value: "$100k", label: "Paper Trading" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--surface-1)] px-6 py-5 text-center">
                <p className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)]">{stat.value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--accent)] mb-4">What you get</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-16">
            Everything to analyze,<br />trade, and compete.
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.tag} className="card-glow p-6 sm:p-8">
                <span className="text-xs font-mono text-[var(--accent)] tracking-wider">{f.tag}</span>
                <h3 className="text-xl font-semibold text-white mt-3 mb-3 font-[family-name:var(--font-source-serif)]">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-4">
            Prove it yourself.
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
            Create an account, see our daily picks, and challenge the algorithm with paper trades.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-[var(--surface-0)] px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold text-white font-[family-name:var(--font-source-serif)]">Macrolyst</span>
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Not financial advice. For educational and informational purposes only. Paper trading uses simulated money.
          </p>
        </div>
      </footer>
    </div>
  );
}
