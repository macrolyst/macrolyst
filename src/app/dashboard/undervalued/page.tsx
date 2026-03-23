import { ScreenerView } from "../volume/screener-view";

export default function UndervaluedPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Market</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Undervalued Large Caps</h1>
      </div>
      <ScreenerView scrId="undervalued_large_caps" metric="peRatio" />
    </div>
  );
}
