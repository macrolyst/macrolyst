import { ScreenerClient } from "./screener-client";

export default function ScreenerBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Tools</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Stock Screener</h1>
      </div>
      <ScreenerClient />
    </div>
  );
}
