import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-(--border) py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-(--accent) flex items-center justify-center">
                <span className="text-(--surface-0) font-bold text-xs font-(family-name:--font-source-serif)">M</span>
              </div>
              <span className="text-base font-bold text-white font-(family-name:--font-source-serif) tracking-tight">
                Macrolyst
              </span>
            </div>
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              S&P 500 analysis, paper trading, and challenge mode. Prove the data works.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-(--text-secondary) hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-sm text-(--text-secondary) hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="text-sm text-(--text-secondary) hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#faq" className="text-sm text-(--text-secondary) hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Platform</p>
            <ul className="space-y-2.5">
              <li><Link href="/auth/sign-up" className="text-sm text-(--text-secondary) hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link href="/auth/sign-in" className="text-sm text-(--text-secondary) hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/dashboard" className="text-sm text-(--text-secondary) hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Data */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Data Sources</p>
            <ul className="space-y-2.5">
              <li><span className="text-sm text-(--text-secondary)">Yahoo Finance</span></li>
              <li><span className="text-sm text-(--text-secondary)">Finnhub</span></li>
              <li><span className="text-sm text-(--text-secondary)">FRED</span></li>
              <li><span className="text-sm text-(--text-secondary)">Wikipedia</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-(--border) flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-(--text-secondary)">
            2026 Macrolyst. Not financial advice.
          </p>
          <p className="text-xs text-(--text-secondary) text-center">
            Paper trading uses simulated money. Past performance does not indicate future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
