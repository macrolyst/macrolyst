export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMarketCap(value: number | null): string {
  if (value === null || value === undefined) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "--";
  // Date-only strings ("YYYY-MM-DD") are parsed as UTC by JS, which shifts
  // back a day when formatted in US timezones. Append T12:00:00 to avoid this.
  const d =
    typeof date === "string"
      ? new Date(date.includes("T") ? date : `${date}T12:00:00`)
      : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "--";
  const d =
    typeof date === "string"
      ? new Date(date.includes("T") ? date : `${date}T12:00:00`)
      : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}

export function formatCompactNumber(value: number | null): string {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}
