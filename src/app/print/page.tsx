"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { expenseBreakdown, expensesByCategory, filterTransactions, projectMoney, type LedgerKind, type LedgerSort } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function PrintInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);

  if (!project) return <div className="p-6">المشروع مش موجود.</div>;

  const client = state.clients.find((item) => item.id === project.clientId);
  const money = projectMoney(state, project.id);
  const rows = expensesByCategory(state, project.id);
  const txs = filterTransactions(state, project.id, {
    query: params.get("q") || "",
    sort: (params.get("sort") as LedgerSort) || "newest",
    kind: (params.get("kind") as LedgerKind) || "all",
    categoryId: params.get("category") || "",
  });

  return (
    <div className="mx-auto max-w-3xl bg-white px-4 py-6 text-stone-900">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          تحميل PDF
        </button>
        <Link href={`/project/?id=${encodeURIComponent(project.id)}`} className="btn btn-secondary">
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

      <section className="mb-6 grid grid-cols-2 gap-3 text-center">
        <Box label="المستلم" value={formatMoney(money.received)} />
        <Box label="المتبقي" value={formatMoney(money.remaining)} />
        <Box label="نسبة الإشراف المستلمة" value={formatMoney(money.supervisionReceived)} />
        <Box label="المصروف" value={formatMoney(money.spent)} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">توزيع المصروفات</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-right">
              <th className="py-2">البند</th>
              <th className="py-2">مشتريات</th>
              <th className="py-2">نقل وتشوين</th>
              <th className="py-2">مقاولين</th>
              <th className="py-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category.id} className="border-b border-stone-100">
                <td className="py-2">{row.category.name}</td>
                <td className="py-2">{formatMoney(row.purchase)}</td>
                <td className="py-2">{formatMoney(row.transport)}</td>
                <td className="py-2">{formatMoney(row.labor)}</td>
                <td className="py-2 font-semibold">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">الحركات</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-right">
              <th className="py-2">التاريخ</th>
              <th className="py-2">البيان</th>
              <th className="py-2">النوع</th>
              <th className="py-2">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => {
              const category = state.categories.find((item) => item.id === tx.categoryId);
              return (
                <tr key={tx.id} className="border-b border-stone-100">
                  <td className="py-2">{formatDay(tx.date)}</td>
                  <td className="py-2">{tx.notes || "—"}</td>
                  <td className="py-2">
                    {tx.type === "client_payment"
                      ? tx.paymentClass === "supervision"
                        ? "إشراف"
                        : "دفعة عميل"
                      : category?.name || "مصروف"}
                  </td>
                  <td className="py-2 font-semibold">
                    {tx.type === "client_payment" ? "+" : "−"}
                    {formatMoney(tx.type === "expense" ? expenseBreakdown(tx).total : tx.amount)}
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

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-xs">{label}</p>
      <p className="text-xl font-bold">{value}</p>
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
