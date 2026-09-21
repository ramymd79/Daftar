"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SummaryCards } from "@/components/SummaryCards";
import { expensesByCategory, projectTotals } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function ClientInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const [tab, setTab] = useState<"finance" | "photos">("finance");

  const totals = useMemo(
    () => (project ? projectTotals(state, project.id) : null),
    [state, project],
  );
  const byCategory = useMemo(
    () => (project ? expensesByCategory(state, project.id) : []),
    [state, project],
  );

  if (!project || !totals) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="card">المشروع مش متاح.</p>
      </div>
    );
  }

  const client = state.clients.find((item) => item.id === project.clientId);
  const photos = state.photos.filter(
    (photo) => photo.projectId === project.id && photo.sharedWithClient,
  );

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] pb-8">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex items-start justify-between gap-3">
          <p>عرض للعميل {client?.name || ""} للمراجعة بس. مفيش تعديل من هنا.</p>
          <Link
            href={`/project/?id=${encodeURIComponent(project.id)}`}
            className="shrink-0 font-bold underline"
          >
            رجوع
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="text-xl font-black">{project.name}</h1>
        {project.address ? (
          <p className="mt-1 text-sm text-stone-500">{project.address}</p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={`btn flex-1 text-sm ${tab === "finance" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("finance")}
          >
            المالية
          </button>
          <button
            type="button"
            className={`btn flex-1 text-sm ${tab === "photos" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("photos")}
          >
            الصور
          </button>
        </div>

        {tab === "finance" ? (
          <div className="mt-4 space-y-4">
            <SummaryCards
              received={totals.received}
              spent={totals.spent}
              remaining={totals.remaining}
              contractTotal={project.contractTotal}
            />

            <section className="card">
              <h2 className="mb-3 font-bold">المصروف حسب الفئة</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-stone-500">لسه مفيش مصروفات.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {byCategory.map((row) => (
                    <li key={row.category.id} className="flex justify-between gap-3">
                      <span>{row.category.name}</span>
                      <span>
                        {row.pct.toFixed(0)}% · {formatMoney(row.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">الحركات</h2>
                <Link
                  href={`/print/?id=${encodeURIComponent(project.id)}`}
                  className="text-sm font-semibold text-[var(--brand)]"
                >
                  طباعة الكشف
                </Link>
              </div>
              <ul className="divide-y divide-stone-100 text-sm">
                {totals.txs.map((tx) => (
                  <li key={tx.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {tx.type === "client_payment"
                        ? tx.notes || "دفعة"
                        : tx.notes || "مصروف"}
                      <span className="block text-xs text-stone-500">
                        {formatDay(tx.date)}
                      </span>
                    </span>
                    <span className="font-bold">{formatMoney(tx.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {photos.length === 0 ? (
              <p className="card col-span-2 text-stone-500">مفيش صور ظاهرة للعميل.</p>
            ) : (
              photos.map((photo) => (
                <div key={photo.id} className="card p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || "صورة"}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <p className="mt-2 truncate text-xs">{photo.caption}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div className="p-6">جاري التحميل…</div>}>
      <ClientInner />
    </Suspense>
  );
}
