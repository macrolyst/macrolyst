import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-(--border) bg-(--surface-0)/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-(--accent) flex items-center justify-center">
            <span className="text-(--surface-0) font-bold text-xs font-(family-name:--font-source-serif)">M</span>
          </div>
          <span className="text-lg font-bold text-white font-(family-name:--font-source-serif) tracking-tight">
            Macrolyst
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <a href="#features" className="show-desktop text-sm text-(--text-secondary) hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="show-desktop text-sm text-(--text-secondary) hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="show-desktop text-sm text-(--text-secondary) hover:text-white transition-colors">Pricing</a>
          <Link
            href="/auth/sign-in"
            className="text-sm text-(--text-secondary) hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="text-sm font-medium bg-(--accent) text-(--surface-0) px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
