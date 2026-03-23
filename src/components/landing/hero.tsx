"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const sidebarGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard" },
      { label: "Current News" },
      { label: "Most Active" },
      { label: "Gainers & Losers" },
    ],
  },
  {
    label: "Last Trading Day",
    items: [
      { label: "Overview" },
      { label: "Recommendations" },
      { label: "Scanners" },
    ],
  },
  {
    label: "Trading",
    items: [
      { label: "Paper Trading" },
    ],
  },
];

const allItems = sidebarGroups.flatMap((g) => g.items);

const pageContents = [
  // 0: Dashboard — matches actual 2-panel layout
  <div key="dashboard" className="p-3 space-y-2">
    {/* Top row: Portfolio + Chart */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {/* Portfolio card with donut */}
      <div className="p-3 rounded-lg bg-(--surface-2)/50 border border-(--border)">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[8px] text-(--text-secondary) uppercase">Portfolio</p>
          <span className="text-[7px] text-(--accent)">View all</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-base font-bold text-white font-(family-name:--font-source-serif)">$49,972</p>
            <span className="text-[9px] text-(--down)">-0.06% -$27.70</span>
            <p className="text-[8px] text-(--text-secondary) mt-1">$42,798 cash</p>
          </div>
          {/* Fake donut */}
          <div className="w-12 h-12 rounded-full border-4 border-(--accent) border-t-[--gold] border-r-[--up] shrink-0" />
        </div>
        <div className="mt-2 pt-2 border-t border-(--border) space-y-1">
          <div className="flex justify-between text-[8px]"><span className="text-white font-semibold">APP <span className="text-(--text-secondary) font-normal">10 shares</span></span><span className="text-white">$458.95 <span className="text-(--down)">-3.74%</span></span></div>
          <div className="flex justify-between text-[8px]"><span className="text-white font-semibold">DDOG <span className="text-(--text-secondary) font-normal">20 shares</span></span><span className="text-white">$129.23 <span className="text-(--up)">+3.32%</span></span></div>
        </div>
      </div>
      {/* Chart card */}
      <div className="p-3 rounded-lg bg-(--surface-2)/50 border border-(--border)">
        <div className="flex items-center justify-between mb-1">
          <div className="flex gap-1">
            <span className="text-[8px] px-1.5 py-0.5 rounded-lg bg-(--accent)/15 text-(--accent)">SPY</span>
            <span className="text-[8px] px-1.5 py-0.5 text-(--text-secondary)">QQQ</span>
            <span className="text-[8px] px-1.5 py-0.5 text-(--text-secondary)">DIA</span>
          </div>
          <div className="flex gap-1">
            <span className="text-[7px] text-(--text-secondary)">1W</span>
            <span className="text-[7px] px-1 rounded bg-(--accent)/15 text-(--accent)">1M</span>
            <span className="text-[7px] text-(--text-secondary)">3M</span>
          </div>
        </div>
        <p className="text-[8px] text-(--text-secondary)">S&P 500</p>
        <div className="flex items-end gap-1.5">
          <p className="text-sm font-bold text-white font-(family-name:--font-source-serif)">$655.38</p>
          <span className="text-[9px] text-(--up)">+1.05%</span>
        </div>
        <div className="h-16 mt-1 flex items-end gap-px">
          {[50, 48, 52, 55, 50, 53, 58, 55, 60, 57, 62, 58, 64, 60, 65, 62, 68, 64, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: 'var(--down)', opacity: 0.3 + (i / 25) }} />
          ))}
        </div>
      </div>
    </div>
    {/* Trending row */}
    <div className="p-2 rounded-lg bg-(--surface-2)/50 border border-(--border)">
      <p className="text-[7px] text-(--text-secondary) uppercase mb-1">Trending Now</p>
      <div className="flex gap-1 overflow-hidden">
        {["UGRO $6.15 +182%", "PLTR $160 +6.7%", "QS $7.05 +6.9%", "UNH $270 -2.2%", "LUNR $20 +13.9%"].map((t) => (
          <div key={t} className="px-1.5 py-0.5 rounded bg-(--surface-3) text-[7px] text-white whitespace-nowrap shrink-0">{t}</div>
        ))}
      </div>
    </div>
    {/* Bottom: News + Mood/Scanners */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="p-2.5 rounded-lg bg-(--surface-2)/50 border border-(--border)">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[7px] text-(--text-secondary) uppercase">Current News</p>
          <span className="text-[7px] text-(--accent)">View all</span>
        </div>
        {["Fed signals rate pause amid cooling inflation data", "NVIDIA beats Q4 estimates, stock surges 8%", "Treasury yields drop to 3-month low on rotation"].map((h, i) => (
          <div key={i} className="py-1 border-b border-(--border) last:border-0">
            <p className="text-[8px] text-white leading-snug">{h}</p>
            <span className="text-[7px] text-(--accent)/60">Reuters · 2h ago</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="p-2.5 rounded-lg bg-(--surface-2)/50 border border-(--border)">
          <p className="text-[7px] text-(--text-secondary) uppercase mb-0.5">Market Mood</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-(--up)" /><span className="text-sm font-bold text-white">Bullish</span></div>
            <div className="text-right"><p className="text-[7px] text-(--text-secondary)">VIX</p><p className="text-[10px] font-bold text-white">26.78</p></div>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-(--surface-2)/50 border border-(--border)">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[7px] text-(--text-secondary) uppercase">Scanner Alerts</p>
            <span className="text-[7px] text-(--accent)">View all</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded bg-(--surface-3) px-1.5 py-1"><p className="text-[7px] text-(--text-secondary)">MACD Bullish</p><p className="text-sm font-bold text-white">20</p></div>
            <div className="rounded bg-(--surface-3) px-1.5 py-1"><p className="text-[7px] text-(--text-secondary)">Bollinger</p><p className="text-sm font-bold text-white">20</p></div>
          </div>
        </div>
      </div>
    </div>
  </div>,
  // 1: Current News — 3-col card grid with image placeholders
  <div key="news" className="p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-(--up) pulse-dot" />
        <span className="text-[8px] text-(--text-secondary)">Live Feed — 50 articles</span>
      </div>
      <span className="text-[7px] text-(--text-secondary)">Updated 3:54 PM <span className="text-(--accent)">Refresh</span></span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {[
        { source: "Reuters", headline: "Fed signals rate pause as inflation data softens" },
        { source: "CNBC", headline: "Here are the things we want to see to trust this rally" },
        { source: "CNBC", headline: "How Jim Cramer is playing Monday's market rebound" },
        { source: "CNBC", headline: "Trump admin plans to bring more diesel to market" },
        { source: "Reuters", headline: "Ukraine has irrefutable evidence of Russia intelligence" },
        { source: "CNBC", headline: "Why job seekers are spending thousands on recruiters" },
        { source: "Reuters", headline: "Iranian oil offered to India at premium to Brent" },
        { source: "Reuters", headline: "Trump says US has major points of agreement with Iran" },
        { source: "Reuters", headline: "Israeli minister calls for annexation of southern Lebanon" },
      ].map((n, i) => (
        <div key={i} className="rounded-lg bg-(--surface-2)/50 border border-(--border) overflow-hidden">
          <div className="h-14 bg-(--surface-3) flex items-center justify-center">
            <span className="text-[9px] text-(--text-secondary)/30 font-bold">{n.source}</span>
          </div>
          <div className="p-2">
            <p className="text-[8px] text-white leading-snug line-clamp-2">{n.headline}</p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[7px] text-(--accent)/70">{n.source}</span>
              <span className="text-[7px] text-(--text-secondary)/50">{i < 2 ? "2h ago" : i < 4 ? "4h ago" : "5h ago"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>,
  // 2: Most Active
  <div key="active" className="p-4">
    <div className="flex gap-1 mb-3">
      <span className="px-2 py-0.5 rounded text-[8px] bg-(--accent)/15 text-(--accent) font-medium">Most Active</span>
      <span className="px-2 py-0.5 rounded text-[8px] text-(--text-secondary)">Gainers</span>
      <span className="px-2 py-0.5 rounded text-[8px] text-(--text-secondary)">Losers</span>
    </div>
    {[
      { r: 1, t: "NVDA", n: "NVIDIA", p: "$892", v: "142M", x: "3.2x", c: "+4.2%" },
      { r: 2, t: "TSLA", n: "Tesla", p: "$246", v: "99M", x: "2.8x", c: "-2.1%" },
      { r: 3, t: "AAPL", n: "Apple", p: "$199", v: "87M", x: "1.9x", c: "+1.5%" },
      { r: 4, t: "AMD", n: "AMD", p: "$178", v: "76M", x: "2.4x", c: "+3.8%" },
      { r: 5, t: "AMZN", n: "Amazon", p: "$185", v: "63M", x: "1.7x", c: "+0.9%" },
      { r: 6, t: "META", n: "Meta", p: "$502", v: "58M", x: "1.5x", c: "+2.1%" },
    ].map((s) => (
      <div key={s.t} className="flex items-center justify-between py-1.5 border-b border-(--border) last:border-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-(--text-secondary)/50 w-3">{s.r}</span>
          <div><p className="text-[10px] font-semibold text-white">{s.t}</p><p className="text-[8px] text-(--text-secondary)">{s.n}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white">{s.p}</span>
          <span className="text-[8px] text-(--text-secondary)">{s.v}</span>
          <span className={`text-[8px] font-mono font-semibold ${parseFloat(s.x) >= 2 ? "text-(--up)" : "text-white"}`}>{s.x}</span>
          <span className={`text-[8px] px-1 py-0.5 rounded ${s.c.startsWith("+") ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"}`}>{s.c}</span>
          <span className="text-[8px] text-(--accent) px-1 py-0.5 rounded border border-(--accent)/30">Buy</span>
        </div>
      </div>
    ))}
  </div>,
  // 3: Gainers & Losers
  <div key="movers" className="p-4">
    <div className="flex gap-1 mb-3">
      <span className="px-2 py-0.5 rounded text-[8px] bg-(--up)/20 text-(--up) font-medium">Gainers</span>
      <span className="px-2 py-0.5 rounded text-[8px] text-(--text-secondary)">Losers</span>
    </div>
    {[
      { r: 1, t: "SMCI", n: "Super Micro", p: "$714", c: "+12.4%" },
      { r: 2, t: "NVDA", n: "NVIDIA", p: "$892", c: "+4.2%" },
      { r: 3, t: "AMD", n: "AMD", p: "$178", c: "+3.8%" },
      { r: 4, t: "AVGO", n: "Broadcom", p: "$1,340", c: "+3.5%" },
      { r: 5, t: "CRM", n: "Salesforce", p: "$284", c: "+2.9%" },
      { r: 6, t: "META", n: "Meta", p: "$502", c: "+2.1%" },
    ].map((s) => (
      <div key={s.t} className="flex items-center justify-between py-1.5 border-b border-(--border) last:border-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-(--text-secondary)/50 w-3">{s.r}</span>
          <div><p className="text-[10px] font-semibold text-white">{s.t}</p><p className="text-[8px] text-(--text-secondary)">{s.n}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white">{s.p}</span>
          <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-(--up)/15 text-(--up)">{s.c}</span>
          <span className="text-[8px] text-(--accent) px-1 py-0.5 rounded border border-(--accent)/30">Buy</span>
        </div>
      </div>
    ))}
  </div>,
  // 4: Overview (last trading day) — pulse cards + sector bars + top picks
  <div key="overview" className="p-3 space-y-2">
    {/* Pulse cards */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {[
        { l: "Market Breadth", v: "Bullish", d: "441 up / 61 down", c: "var(--up)" },
        { l: "VIX", v: "26.78", d: "Volatility Index", c: "var(--text-primary)" },
        { l: "10Y Treasury", v: "--", d: "", c: "var(--text-primary)" },
        { l: "Fed Funds", v: "--", d: "Target Rate", c: "var(--text-primary)" },
      ].map((c) => (
        <div key={c.l} className="p-2 rounded-lg bg-(--surface-2)/50 border border-(--border)">
          <p className="text-[7px] text-(--text-secondary) uppercase">{c.l}</p>
          <p className="text-xs font-bold mt-0.5 font-(family-name:--font-source-serif)" style={{ color: c.c }}>{c.v}</p>
          {c.d && <p className="text-[7px] text-(--text-secondary)">{c.d}</p>}
        </div>
      ))}
    </div>
    {/* Sector Performance + Top Picks */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="sm:col-span-2 p-2.5 rounded-lg bg-(--surface-2)/50 border border-(--border)">
        <p className="text-[7px] text-(--text-secondary) uppercase mb-1.5">Sector Performance</p>
        {[
          { s: "Consumer Disc.", w: "95%" },
          { s: "Materials", w: "88%" },
          { s: "Info Tech", w: "82%" },
          { s: "Industrials", w: "75%" },
          { s: "Financials", w: "60%" },
          { s: "Real Estate", w: "55%" },
          { s: "Energy", w: "48%" },
        ].map((sec) => (
          <div key={sec.s} className="flex items-center gap-1.5 mb-3">
            <span className="text-[7px] text-(--text-secondary) w-16 text-right shrink-0 truncate">{sec.s}</span>
            <div className="flex-1 h-3 rounded-sm bg-(--surface-3) overflow-hidden">
              <div className="h-full rounded-sm bg-(--accent)" style={{ width: sec.w }} />
            </div>
          </div>
        ))}
      </div>
      <div className="p-2.5 rounded-lg bg-(--surface-2)/50 border border-(--border)">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[7px] text-(--text-secondary) uppercase">Top 5 Picks</p>
          <span className="text-[7px] text-(--accent)">View all</span>
        </div>
        {[
          { r: 1, t: "APP", n: "AppLovin", s: 75 },
          { r: 2, t: "ANET", n: "Arista", s: 74 },
          { r: 3, t: "DDOG", n: "Datadog", s: 73 },
          { r: 4, t: "XYZ", n: "Block", s: 73 },
          { r: 5, t: "INTU", n: "Intuit", s: 69 },
        ].map((p) => (
          <div key={p.t} className="flex items-center justify-between py-1 border-b border-(--border) last:border-0">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-(--text-secondary)/50">{p.r}</span>
              <div><p className="text-[9px] font-semibold text-white">{p.t}</p><p className="text-[7px] text-(--text-secondary)">{p.n}</p></div>
            </div>
            <div className="text-right"><span className="text-[10px] font-bold text-(--accent)">{p.s}</span></div>
          </div>
        ))}
      </div>
    </div>
  </div>,
  // 5: Recommendations
  <div key="recs" className="p-4">
    <p className="text-[9px] text-(--text-secondary) uppercase mb-2">Top Recommendations</p>
    {[
      { r: 1, t: "APP", n: "AppLovin", p: "$470", s: 75, c: "+6.3%" },
      { r: 2, t: "ANET", n: "Arista Networks", p: "$138", s: 74, c: "+4.8%" },
      { r: 3, t: "DDOG", n: "Datadog", p: "$130", s: 73, c: "+3.8%" },
      { r: 4, t: "XYZ", n: "Block Inc", p: "$62", s: 73, c: "+3.9%" },
      { r: 5, t: "INTU", n: "Intuit", p: "$458", s: 72, c: "+0.5%" },
    ].map((s) => (
      <div key={s.t} className="flex items-center justify-between py-1.5 border-b border-(--border) last:border-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-(--text-secondary)/50 w-3">{s.r}</span>
          <div><p className="text-[10px] font-semibold text-white">{s.t}</p><p className="text-[8px] text-(--text-secondary)">{s.n}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-white">{s.p}</span>
          <span className={`text-[8px] px-1 py-0.5 rounded ${s.c.startsWith("+") ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"}`}>{s.c}</span>
          <div className="text-right"><span className="text-sm font-bold text-(--accent)">{s.s}</span><p className="text-[7px] text-(--text-secondary)">score</p></div>
        </div>
      </div>
    ))}
  </div>,
  // 6: Scanners — tabs + table with stock/sector/price/today/RSI/score/buy
  <div key="scanners" className="p-3">
    <div className="flex gap-1 mb-2 flex-wrap">
      {[
        { l: "RSI Oversold (14)", a: true },
        { l: "MACD Bullish (20)", a: false },
        { l: "Volume Spike (3)", a: false },
        { l: "Bollinger (20)", a: false },
        { l: "Near 52W Low (20)", a: false },
      ].map((s) => (
        <span key={s.l} className={`px-2 py-0.5 rounded-full text-[7px] font-medium border ${s.a ? "border-(--accent)/30 text-(--accent) bg-(--accent)/10" : "border-(--border) text-(--text-secondary)"}`}>{s.l}</span>
      ))}
    </div>
    {/* Table header */}
    <div className="hidden sm:grid grid-cols-12 gap-1 px-2 py-1 text-[7px] text-(--text-secondary) uppercase border-b border-(--border)">
      <div className="col-span-3">Stock</div>
      <div className="col-span-2">Sector</div>
      <div className="col-span-2 text-right">Price</div>
      <div className="col-span-1 text-right">Today</div>
      <div className="col-span-1 text-right">RSI</div>
      <div className="col-span-1 text-right">Score</div>
      <div className="col-span-2 text-right"></div>
    </div>
    {[
      { t: "GIS", n: "General Mills", sec: "Consumer Staples", p: "$37.23", td: "+0.59%", up: true, rsi: "28.7", s: 37 },
      { t: "CPB", n: "Campbell's", sec: "Consumer Staples", p: "$21.00", td: "-0.33%", up: false, rsi: "21.9", s: 47 },
      { t: "MKC", n: "McCormick", sec: "Consumer Staples", p: "$53.84", td: "+1.15%", up: true, rsi: "24.0", s: 55 },
      { t: "UPS", n: "United Parcel", sec: "Industrials", p: "$95.86", td: "-0.72%", up: false, rsi: "25.0", s: 53 },
      { t: "SMCI", n: "Supermicro", sec: "Info Tech", p: "$21.14", td: "+2.97%", up: true, rsi: "26.3", s: 60 },
      { t: "ULTA", n: "Ulta Beauty", sec: "Consumer Disc.", p: "$531.92", td: "+0.37%", up: true, rsi: "26.7", s: 56 },
    ].map((s) => (
      <div key={s.t} className="hidden sm:grid grid-cols-12 gap-1 px-2 py-1.5 border-b border-(--border) last:border-0 items-center text-[8px]">
        <div className="col-span-3"><span className="font-semibold text-white">{s.t}</span> <span className="text-(--text-secondary)">{s.n}</span></div>
        <div className="col-span-2 text-(--text-secondary)">{s.sec}</div>
        <div className="col-span-2 text-right font-mono text-white">{s.p}</div>
        <div className={`col-span-1 text-right ${s.up ? "text-(--up)" : "text-(--down)"}`}>{s.td}</div>
        <div className="col-span-1 text-right font-mono text-white">{s.rsi}</div>
        <div className="col-span-1 text-right"><span className="inline-block w-5 h-5 rounded-full bg-(--accent)/20 text-(--accent) text-[8px] font-bold leading-5 text-center">{s.s}</span></div>
        <div className="col-span-2 text-right"><span className="text-[7px] text-(--accent) px-1 py-0.5 rounded border border-(--accent)/30">Buy</span></div>
      </div>
    ))}
    {/* Mobile fallback */}
    <div className="sm:hidden space-y-1">
      {[
        { t: "GIS", p: "$37.23", rsi: "28.7", s: 37 },
        { t: "CPB", p: "$21.00", rsi: "21.9", s: 47 },
        { t: "SMCI", p: "$21.14", rsi: "26.3", s: 60 },
        { t: "ULTA", p: "$531.92", rsi: "26.7", s: 56 },
      ].map((s) => (
        <div key={s.t} className="flex items-center justify-between py-1 border-b border-(--border) last:border-0">
          <span className="text-[9px] font-semibold text-white">{s.t}</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-white">{s.p}</span>
            <span className="text-[8px] text-(--down)">RSI {s.rsi}</span>
            <span className="text-[8px] text-(--accent) px-1 py-0.5 rounded border border-(--accent)/30">Buy</span>
          </div>
        </div>
      ))}
    </div>
  </div>,
  // 7: Paper Trading
  <div key="trading" className="p-4">
    <div className="p-3 rounded-lg bg-(--surface-2)/50 border border-(--border) mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[8px] text-(--text-secondary) uppercase">Portfolio Value</p>
        <div className="flex gap-1"><span className="text-[8px] text-(--text-secondary)">Closed</span><span className="text-[8px] text-(--text-secondary)">Reset</span></div>
      </div>
      <p className="text-lg font-bold text-white font-(family-name:--font-source-serif)">$49,972.30</p>
      <span className="text-[9px] text-(--down)">-0.06% (-$27.70) all time</span>
      <div className="h-10 mt-2 flex items-end gap-px">
        {[80, 78, 75, 72, 70, 68, 65, 62, 60, 58, 55, 52, 50, 48, 46].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: 'var(--down)', opacity: 0.3 + (i / 25) }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-(--border)">
        <div><p className="text-[7px] text-(--text-secondary) uppercase">Cash</p><p className="text-[10px] font-bold text-white">$42,798</p></div>
        <div><p className="text-[7px] text-(--text-secondary) uppercase">Invested</p><p className="text-[10px] font-bold text-white">$7,174</p></div>
        <div><p className="text-[7px] text-(--text-secondary) uppercase">Starting</p><p className="text-[10px] font-bold text-(--text-secondary)">$50,000</p></div>
      </div>
    </div>
    <div className="flex justify-center gap-3 mb-2 text-[9px]">
      <span className="text-white border-b border-(--accent) pb-0.5">Portfolio</span>
      <span className="text-(--text-secondary)">Watchlist</span>
      <span className="text-(--text-secondary)">Orders</span>
      <span className="text-(--text-secondary)">History</span>
    </div>
    {[
      { t: "APP", sh: "10 shares @ $461.16", p: "$458.95", c: "-3.74%", up: false },
      { t: "DDOG", sh: "20 shares @ $129.51", p: "$129.23", c: "+3.32%", up: true },
    ].map((h) => (
      <div key={h.t} className="flex items-center justify-between py-2 border-b border-(--border) last:border-0">
        <div><p className="text-[10px] font-semibold text-white">{h.t}</p><p className="text-[8px] text-(--text-secondary)">{h.sh}</p></div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className="w-1 h-1 rounded-full bg-(--up)" />
            <span className="text-[10px] font-mono text-white">{h.p}</span>
            <span className={`text-[8px] px-1 py-0.5 rounded ${h.up ? "bg-(--up)/15 text-(--up)" : "bg-(--down)/15 text-(--down)"}`}>{h.c}</span>
          </div>
        </div>
      </div>
    ))}
  </div>,
];


export function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % pageContents.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-200 h-200 bg-(--accent) rounded-full opacity-4 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-(--accent) rounded-full opacity-2 blur-2xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <div className="fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--border) bg-(--surface-1) mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-(--up) pulse-dot" />
            <span className="text-xs text-(--text-secondary) tracking-wide uppercase">Real-time data. Educational platform.</span>
          </div>

          <h1 className="fade-up fade-up-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold text-white font-(family-name:--font-source-serif) leading-[1.08] tracking-tight">
            Learn to trade<br /><span className="text-(--accent)">with real data.</span>
          </h1>

          <p className="fade-up fade-up-delay-2 mt-6 text-lg sm:text-xl text-(--text-secondary) leading-relaxed max-w-xl mx-auto lg:mx-0">
            S&P 500 analysis, live market screeners, real-time prices, and paper trading with $100k simulated capital. Free forever. Not financial advice.
          </p>

          <div className="fade-up fade-up-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link href="/auth/sign-up" className="group inline-flex items-center gap-2 bg-(--accent) text-(--surface-0) px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all w-full sm:w-auto justify-center">
              Start Learning Free
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-(--text-secondary) hover:text-white transition-colors">
              See how it works
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </a>
          </div>

          <p className="fade-up fade-up-delay-4 mt-4 text-xs text-(--text-secondary)/60">No credit card required. For educational purposes only.</p>
        </div>

        {/* App preview */}
        <div className="fade-up fade-up-delay-4 mt-12 lg:mt-0 relative">
          <div className="absolute -inset-4 bg-linear-to-b from-(--accent)/10 to-transparent rounded-2xl blur-xl opacity-50" />
          <div className="relative rounded-xl border border-(--border) bg-(--surface-1) overflow-hidden shadow-2xl shadow-black/40">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-(--border) bg-(--surface-0)/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-(--down)/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-(--gold)/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-(--up)/40" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-(--surface-2) text-[10px] text-(--text-secondary)">macrolyst.vercel.app/dashboard</div>
              </div>
            </div>

            {/* Sidebar + Content */}
            <div className="flex min-h-[320px] sm:min-h-[360px]">
              {/* Sidebar — desktop only */}
              <div className="hidden sm:flex flex-col w-44 border-r border-(--border) bg-(--surface-0)/30 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-(--border)">
                  <div className="w-5 h-5 rounded bg-(--accent) flex items-center justify-center">
                    <span className="text-(--surface-0) font-bold text-[8px] font-(family-name:--font-source-serif)">M</span>
                  </div>
                  <span className="text-[10px] font-bold text-white font-(family-name:--font-source-serif)">Macrolyst</span>
                </div>
                <div className="py-1.5 px-2 flex-1 overflow-hidden">
                  {sidebarGroups.map((group) => (
                    <div key={group.label} className="mb-2">
                      <p className="px-2 mb-0.5 text-[7px] font-semibold uppercase tracking-wider text-(--text-secondary)/50">{group.label}</p>
                      {group.items.map((item) => {
                        const idx = allItems.findIndex((a) => a.label === item.label);
                        return (
                          <button
                            key={item.label}
                            onClick={() => setActive(idx)}
                            className={`w-full px-2 py-1 rounded-md text-left cursor-pointer transition-colors ${
                              active === idx ? "bg-(--accent)/10 text-(--accent)" : "text-(--text-secondary) hover:text-white"
                            }`}
                          >
                            <span className="text-[8px] font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 relative overflow-hidden">
                {pageContents.map((page, i) => (
                  <div key={i} className={`absolute inset-0 transition-all duration-500 overflow-y-auto ${active === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                    {page}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1 justify-center py-2.5">
              {pageContents.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${active === i ? "bg-(--accent) w-4" : "bg-(--surface-3)"}`} />
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
