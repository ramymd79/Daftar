"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { expensesByCategory, projectMoney } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function ClientInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const [tab, setTab] = useState<"finance" | "photos">("finance");

  if (!project) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="card">المشروع مش متاح.</p>
      </div>
    );
  }

  const client = state.clients.find((item) => item.id === project.clientId);
  const money = projectMoney(state, project.id);
  const rows = expensesByCategory(state, project.id);
  const photos = state.photos.filter(
    (photo) => photo.projectId === project.id && photo.sharedWithClient,
  );
  const publicTxs = money.txs;

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] pb-8">
      <div className="bg-emerald-800 px-4 py-3 text-sm text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">تشاهد كعميل: {client?.name || "عميل"}</p>
            <p className="mt-1 text-emerald-50">وضع للقراءة فقط. لا يمكن التعديل.</p>
          </div>
          <Link href={`/project/?id=${encodeURIComponent(project.id)}`} className="shrink-0 font-bold underline">
            خروج
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs text-stone-500">مرحبًا</p>
        <h1 className="text-xl font-black">{project.name}</h1>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <button
            type="button"
            className={`rounded-2xl px-3 py-2 text-sm font-bold ${tab === "finance" ? "bg-white" : "text-stone-500"}`}
            onClick={() => setTab("finance")}
          >
            المالية
          </button>
          <button
            type="button"
            className={`rounded-2xl px-3 py-2 text-sm font-bold ${tab === "photos" ? "bg-white" : "text-stone-500"}`}
            onClick={() => setTab("photos")}
          >
            الصور
          </button>
        </div>

        {tab === "finance" ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <PortalCard
                label="المستلم (شامل الإشراف)"
                hint={project.contractTotal ? `من أصل ${formatMoney(project.contractTotal)}` : undefined}
                value={formatMoney(money.received)}
              />
              <PortalCard
                label="المتبقي بعد المصروف والإشراف"
                value={formatMoney(money.remaining)}
                danger={money.remaining < 0}
              />
              <PortalCard
                label={`نسبة الإشراف المستحقة (${project.supervisionPct || 0}%)`}
                value={formatMoney(money.supervisionDue)}
              />
              <PortalCard label="المصروف" value={formatMoney(money.spent)} danger />
            </div>

            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black">توزيع المصروفات</h2>
                <p className="font-black">{formatMoney(money.spent)}</p>
              </div>
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.category.id}>
                    <div className="mb-1 flex justify-between text-sm font-bold">
                      <span>{row.category.name}</span>
                      <span>
                        ({row.pct.toFixed(0)}%) {formatMoney(row.amount)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 text-center text-xs text-stone-600">
                      <span>مشتريات {formatMoney(row.purchase)}</span>
                      <span>نقل {formatMoney(row.transport)}</span>
                      <span>مقاولين {formatMoney(row.labor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-black">الحركات</h2>
                <Link
                  href={`/print/?id=${encodeURIComponent(project.id)}`}
                  className="text-sm font-bold text-[var(--brand)]"
                >
                  تحميل PDF
                </Link>
              </div>
              <ul className="divide-y divide-stone-100 text-sm">
                {publicTxs.map((tx) => (
                  <li key={tx.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {tx.notes || (tx.type === "client_payment" ? "دفعة" : "مصروف")}
                      <span className="block text-xs text-stone-500">{formatDay(tx.date)}</span>
                    </span>
                    <span className="font-bold">{formatMoney(tx.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
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

function PortalCard({
  label,
  hint,
  value,
  danger,
}: {
  label: string;
  hint?: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="text-xs text-stone-500">{label}</p>
      {hint ? <p className="text-[10px] text-stone-400">{hint}</p> : null}
      <p className={`mt-1 text-lg font-black ${danger ? "text-rose-700" : ""}`}>{value}</p>
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
