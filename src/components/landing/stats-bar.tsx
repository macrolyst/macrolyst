const stats = [
  { value: "500+", label: "Stocks Analyzed Daily" },
  { value: "5", label: "Data Sources" },
  { value: "Real-Time", label: "WebSocket Prices" },
  { value: "$100k", label: "Paper Trading Capital" },
  { value: "1 AM", label: "Pre-Market Updates" },
  { value: "100%", label: "Free" },
];

export function StatsBar() {
  return (
    <section className="py-12 px-6 border-y border-(--border) bg-(--surface-1)/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white font-(family-name:--font-source-serif)">{stat.value}</p>
              <p className="text-xs text-(--text-secondary) mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
