import { formatPercent } from "@/lib/format";

export function ChangeBadge({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) return <span className="text-(--text-secondary)">--</span>;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center text-sm font-medium ${
        isPositive ? "text-(--up)" : "text-(--down)"
      } ${className}`}
    >
      {formatPercent(value)}
    </span>
  );
}
