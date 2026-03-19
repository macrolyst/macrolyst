"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
        isActive
          ? "bg-(--accent)/10 text-(--accent)"
          : "text-(--text-secondary) hover:text-white hover:bg-white/4"
      }`}
    >
      <svg
        className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-(--accent)" : "text-(--text-secondary)/60 group-hover:text-white/60"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
      {label}
    </Link>
  );
}
