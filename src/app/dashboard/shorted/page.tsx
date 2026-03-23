import { ScreenerView } from "../volume/screener-view";

export default function ShortedPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Market</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Most Shorted</h1>
      </div>
      <ScreenerView scrId="most_shorted_stocks" metric="volumeRatio" />
    </div>
  );
}
