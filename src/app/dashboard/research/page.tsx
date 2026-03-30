import { ResearchClient } from "./research-client";

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Analysis</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Stock Research</h1>
      </div>
      <ResearchClient />
    </div>
  );
}
