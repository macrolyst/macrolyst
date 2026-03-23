import Link from "next/link";

export default function ChallengesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.15em] uppercase text-(--accent) mb-1">Trading</p>
        <h1 className="text-2xl font-bold text-white font-(family-name:--font-source-serif)">Challenges</h1>
      </div>
      <div className="card-glow p-8 text-center">
        <p className="text-sm text-(--text-secondary) mb-2">Challenges are coming soon.</p>
        <Link href="/dashboard/trading" className="text-xs text-(--accent) hover:underline">Back to Paper Trading</Link>
      </div>
    </div>
  );
}
