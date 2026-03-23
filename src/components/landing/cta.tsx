import Link from "next/link";

export function Cta() {
  return (
    <section className="py-20 sm:py-28 px-6 border-t border-(--border) relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-(--accent) rounded-full opacity-4 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-(family-name:--font-source-serif) leading-tight mb-4">
          Start learning today.
        </h2>
        <p className="text-lg text-(--text-secondary) mb-10 max-w-md mx-auto">
          Real-time market data, daily analysis, live screeners, and paper trading.
          All free. All educational. No real money required.
        </p>
        <Link
          href="/auth/sign-up"
          className="group inline-flex items-center gap-2 bg-(--accent) text-(--surface-0) px-10 py-4 rounded-lg text-base font-semibold hover:opacity-90 transition-all"
        >
          Get Started Free
          <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
        <p className="mt-4 text-xs text-(--text-secondary)/60">
          No credit card. No premium tier. Free forever.
        </p>
      </div>
    </section>
  );
}
