"use client";

import Link from "next/link";

export function AppShell({
  title,
  children,
  action,
  showFab = false,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  showFab?: boolean;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] pb-24">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[var(--bg)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[var(--brand)]">
              دفتر
            </p>
            <h1 className="text-lg font-bold text-stone-900">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <main className="px-4 pt-4">{children}</main>
      {showFab ? (
        <Link
          href="/money/"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-2xl text-white shadow-lg"
          aria-label="تسجيل حركة فلوس"
        >
          +
        </Link>
      ) : null}
    </div>
  );
}
