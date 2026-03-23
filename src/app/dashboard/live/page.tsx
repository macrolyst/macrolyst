import { LiveNewsFeed } from "./live-news-feed";

export default function LivePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Live</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Live Market Feed</h1>
      </div>
      <LiveNewsFeed />
    </div>
  );
}
