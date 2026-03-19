import { getLatestRun, getScannerResults } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ScannerTabs } from "./scanner-tabs";

export default async function ScannersPage() {
  const run = await getLatestRun();
  if (!run) return <EmptyState title="No scanner data" message="Scanner results will appear after the pipeline runs." />;

  const results = await getScannerResults(run.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
          <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Scanners</h1>
        </div>
        <DataFreshness generatedAt={run.generatedAt} runDate={run.runDate} />
      </div>

      <div className="card-glow p-6">
        {results.length > 0 ? (
          <ScannerTabs results={results} />
        ) : (
          <p className="text-sm text-(--text-secondary) py-8 text-center">No scanner results available.</p>
        )}
      </div>
    </div>
  );
}
