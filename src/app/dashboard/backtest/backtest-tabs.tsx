"use client";

import { useState } from "react";

export function BacktestTabs({
  backtestContent,
  accuracyContent,
}: {
  backtestContent: React.ReactNode;
  accuracyContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"backtest" | "accuracy">("accuracy");

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-(--border)">
        <button
          onClick={() => setTab("accuracy")}
          className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
            tab === "accuracy" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
          }`}
        >
          Accuracy Tracker
        </button>
        <button
          onClick={() => setTab("backtest")}
          className={`text-sm pb-2.5 cursor-pointer transition-colors border-b-2 ${
            tab === "backtest" ? "text-white border-(--accent)" : "text-(--text-secondary) border-transparent hover:text-white"
          }`}
        >
          Backtest (Simulated)
        </button>
      </div>

      <div>{tab === "backtest" ? backtestContent : accuracyContent}</div>
    </div>
  );
}
