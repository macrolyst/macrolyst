import { MoversView } from "./movers-view";

export default function MoversPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Market</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Gainers & Losers</h1>
      </div>
      <MoversView />
    </div>
  );
}
