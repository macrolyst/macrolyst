import { getWatchlist } from "@/lib/actions/watchlist";
import { WatchlistView } from "./watchlist-view";

export default async function WatchlistPage() {
  const items = await getWatchlist();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Watchlist</h1>
      </div>
      <WatchlistView items={items} />
    </div>
  );
}
