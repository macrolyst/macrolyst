"use client";

import { useState } from "react";
import { UserButton } from "@neondatabase/auth/react";
import { SidebarLink } from "./sidebar-link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/recommendations", label: "Recommendations" },
  { href: "/dashboard/news", label: "News & Catalysts" },
  { href: "/dashboard/scanners", label: "Scanners" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/backtest", label: "Backtest" },
  { href: "/dashboard/trading", label: "Paper Trading" },
  { href: "/dashboard/challenges", label: "Challenges" },
  { href: "/dashboard/watchlist", label: "Watchlist" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-[var(--surface-1)] border border-white/10 p-2 text-white cursor-pointer"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="2" rx="1" />
          <rect y="9" width="20" height="2" rx="1" />
          <rect y="15" width="20" height="2" rx="1" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[var(--surface-1)] border-r border-white/10 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <span className="text-lg font-bold text-white font-[family-name:var(--font-source-serif)]">
            Macrolyst
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-[var(--text-secondary)] hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setMobileOpen(false)}>
              <SidebarLink {...item} />
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <UserButton />
        </div>
      </aside>
    </>
  );
}
