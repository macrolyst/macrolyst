export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-[var(--accent)] mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)]">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]/40" />
          Waiting for pipeline data
        </div>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {["Market Breadth", "VIX", "10Y Treasury", "S&P 500"].map((label) => (
          <div key={label} className="card-glow p-5">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">{label}</p>
            <p className="text-2xl font-bold text-white/20 font-[family-name:var(--font-source-serif)]">--</p>
          </div>
        ))}
      </div>

      {/* Main content placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-glow p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)] text-center">
            Market analysis will appear here once the pipeline runs.
          </p>
          <p className="text-xs text-[var(--text-secondary)]/50 mt-2">Updated daily at 6 AM CST</p>
        </div>

        <div className="card-glow p-6 min-h-[300px]">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-4">Top 5 Picks</p>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[var(--text-secondary)]/30 w-4">{i}</span>
                <div className="flex-1 h-8 rounded-md bg-[var(--surface-2)]/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
