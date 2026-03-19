export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-source-serif)] mb-2">Dashboard</h1>
      <p className="text-[var(--text-secondary)]">Market pulse, sectors, and what happened yesterday.</p>
      <div className="mt-8 rounded-lg border border-white/10 bg-[var(--surface-1)] p-8 text-center text-[var(--text-secondary)]">
        Analysis data will appear here once the pipeline runs.
      </div>
    </div>
  );
}
