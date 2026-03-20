import { getLatestRun, getNewsArticles, getCatalystData } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { NewsFeed } from "./news-feed";
import { CatalystDetail } from "./catalyst-detail";

export default async function NewsCatalystsPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No news yet" message="News and catalysts will appear after the pipeline runs." />;

  const [articles, catalyst] = await Promise.all([
    getNewsArticles(run.id),
    getCatalystData(run.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">News & Catalysts</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: "calc(100vh - 160px)" }}>
        <div className="lg:col-span-3 card-glow p-6 overflow-y-auto min-h-0">
          <NewsFeed articles={articles} />
        </div>

        <div className="lg:col-span-2 card-glow p-6 overflow-y-auto min-h-0">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider mb-4">Catalyst Timeline</p>
          {catalyst ? (
            <CatalystDetail catalyst={catalyst} />
          ) : (
            <p className="text-sm text-(--text-secondary) py-8 text-center">No catalyst data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
