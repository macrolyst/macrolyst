export function ScoreBar({
  label,
  value,
  max = 100,
  color = "#34D399",
}: {
  label: string;
  value: number | null;
  max?: number;
  color?: string;
}) {
  const pct = value !== null ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-(--text-secondary) w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-(--surface-2)">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-(--text-primary) w-8 text-right">
        {value !== null ? value.toFixed(0) : "--"}
      </span>
    </div>
  );
}
