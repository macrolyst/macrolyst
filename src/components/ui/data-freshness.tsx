import { formatDateTime } from "@/lib/format";

export function DataFreshness({
  generatedAt,
  runDate,
}: {
  generatedAt: Date | null;
  runDate: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
      <span className="w-1.5 h-1.5 rounded-full bg-(--accent) pulse-dot" />
      <span>Updated {generatedAt ? formatDateTime(generatedAt) : runDate}</span>
    </div>
  );
}
