"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { expensesByCategory, projectTotals } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function PrintInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const totals = useMemo(
    () => (project ? projectTotals(state, project.id) : null),
    [state, project],
  );
  const byCategory = useMemo(
    () => (project ? expensesByCategory(state, project.id) : []),
    [state, project],
  );

  if (!project || !totals) {
    return <div className="p-6">المشروع مش موجود.</div>;
  }

  const client = state.clients.find((item) => item.id === project.clientId);
  const agreementLeft = Math.max(project.contractTotal - totals.received, 0);

  return (
    <div className="mx-auto max-w-3xl bg-white px-4 py-6 text-stone-900">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة أو حفظ PDF
        </button>
        <Link
          href={`/project/?id=${encodeURIComponent(project.id)}`}
          className="btn btn-secondary"
        >
          رجوع
        </Link>
      </div>

      <header className="mb-6 border-b border-stone-200 pb-4">
        <p className="text-sm font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="text-2xl font-black">كشف حساب — {project.name}</h1>
        <p className="mt-1 text-sm text-stone-600">
          العميل: {client?.name || "—"}
          {project.address ? ` · ${project.address}` : ""}
        </p>
        <p className="text-xs text-stone-500">تاريخ الطباعة: {formatDay(new Date().toISOString())}</p>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs">مستلم</p>
          <p className="text-xl font-bold">{formatMoney(totals.received)}</p>
        </div>
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-xs">مصروف</p>
          <p className="text-xl font-bold">{formatMoney(totals.spent)}</p>
        </div>
        <div className="rounded-xl bg-stone-100 p-3">
          <p className="text-xs">متبقي</p>
          <p className="text-xl font-bold">{formatMoney(totals.remaining)}</p>
        </div>
      </section>

      {project.contractTotal > 0 ? (
        <p className="mb-6 text-sm text-stone-600">
          قيمة الاتفاق {formatMoney(project.contractTotal)} · لسه على العميل{" "}
          {formatMoney(agreementLeft)}
        </p>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-2 font-bold">المصروف حسب الفئة</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-right">
              <th className="py-2">الفئة</th>
              <th className="py-2">النسبة</th>
              <th className="py-2">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((row) => (
              <tr key={row.category.id} className="border-b border-stone-100">
                <td className="py-2">{row.category.name}</td>
                <td className="py-2">{row.pct.toFixed(0)}%</td>
                <td className="py-2">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">تفاصيل الحركات</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-right">
              <th className="py-2">التاريخ</th>
              <th className="py-2">البيان</th>
              <th className="py-2">النوع</th>
              <th className="py-2">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {[...totals.txs].reverse().map((tx) => {
              const category = state.categories.find((item) => item.id === tx.categoryId);
              return (
                <tr key={tx.id} className="border-b border-stone-100">
                  <td className="py-2">{formatDay(tx.date)}</td>
                  <td className="py-2">
                    {tx.notes || "—"}
                    {tx.attachmentDataUrl ? " · مرفق" : ""}
                  </td>
                  <td className="py-2">
                    {tx.type === "client_payment" ? "دفعة عميل" : category?.name || "مصروف"}
                  </td>
                  <td className="py-2 font-semibold">
                    {tx.type === "client_payment" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-6">جاري التحميل…</div>}>
      <PrintInner />
    </Suspense>
  );
}
