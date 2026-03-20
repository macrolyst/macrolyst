"use client";

import { useState } from "react";
import { createPortfolio } from "@/lib/actions/trading";
import { useRouter } from "next/navigation";

const BALANCES = [
  { value: 10000, label: "$10,000", desc: "Conservative start" },
  { value: 50000, label: "$50,000", desc: "Moderate portfolio" },
  { value: 100000, label: "$100,000", desc: "Full trading experience" },
];

export function PortfolioSetup() {
  const [selected, setSelected] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      await createPortfolio(selected);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create portfolio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white font-(family-name:--font-source-serif) mb-2">
          Start Paper Trading
        </h2>
        <p className="text-sm text-(--text-secondary)">
          Practice trading with simulated money. No real money involved.
          Pick your starting balance and start building your portfolio.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {BALANCES.map((b) => (
          <button
            key={b.value}
            onClick={() => setSelected(b.value)}
            className={`w-full flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
              selected === b.value
                ? "bg-(--accent)/10 border-(--accent)/40 text-(--accent)"
                : "bg-(--surface-2) border-(--border) text-(--text-secondary) hover:border-(--accent)/20"
            }`}
          >
            <div>
              <p className="text-lg font-bold text-white">{b.label}</p>
              <p className="text-xs text-(--text-secondary)">{b.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected === b.value ? "border-(--accent)" : "border-(--text-secondary)/30"
            }`}>
              {selected === b.value && <div className="w-2.5 h-2.5 rounded-full bg-(--accent)" />}
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-(--down) mb-4 text-center">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-(--accent) text-(--surface-0) font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? "Creating..." : "Start Trading"}
      </button>
    </div>
  );
}
