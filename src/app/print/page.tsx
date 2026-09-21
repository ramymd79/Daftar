"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { expensesByCategory, projectTotals } from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function PrintInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((p) => p.id === projectId);
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

  const client = state.clients.find((c) => c.id === project.clientId);

  return (
    <div className="mx-auto max-w-3xl bg-white px-4 py-6 text-stone-900">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          طباعة / حفظ PDF
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
        <p className="text-xs text-stone-500">
          تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs">المستلم</p>
          <p className="text-xl font-bold">{formatMoney(totals.received)}</p>
        </div>
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-xs">المصروف</p>
          <p className="text-xl font-bold">{formatMoney(totals.spent)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 p-3">
          <p className="text-xs">المتبقي</p>
          <p className="text-xl font-bold">{formatMoney(totals.remaining)}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">ملخص المصروفات حسب البند</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-right">
              <th className="py-2">البند</th>
              <th className="py-2">النسبة</th>
              <th className="py-2">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((row) => (
              <tr key={row.category.id} className="border-b border-stone-100">
                <td className="py-2">{row.category.name}</td>
                <td className="py-2">{row.pct.toFixed(1)}%</td>
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
            {totals.txs.map((tx) => {
              const cat = state.categories.find((c) => c.id === tx.categoryId);
              return (
                <tr key={tx.id} className="border-b border-stone-100">
                  <td className="py-2">
                    {new Date(tx.date).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="py-2">{tx.notes || "—"}</td>
                  <td className="py-2">
                    {tx.type === "client_payment"
                      ? "دفعة عميل"
                      : cat?.name || "مصروف"}
                  </td>
                  <td className="py-2 font-semibold">
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
