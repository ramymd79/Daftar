"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/projects/", label: "مشاريع", icon: "📁" },
  { href: "/clients/", label: "عملاء", icon: "👤" },
  { href: "/contractors/", label: "مقاولون", icon: "👷" },
  { href: "/suppliers/", label: "موردون", icon: "📦" },
  { href: "/settings/", label: "إعدادات", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname() || "";
  const hide =
    pathname === "/" ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/print") ||
    pathname.startsWith("/money");

  if (hide) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur no-print">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/projects/" && pathname.startsWith(item.href.slice(0, -1))) ||
            (item.href === "/projects/" &&
              (pathname.startsWith("/projects") || pathname.startsWith("/project")));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "text-[var(--brand)] font-bold" : "text-stone-500"
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
