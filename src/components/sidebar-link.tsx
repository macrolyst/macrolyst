"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );
}
