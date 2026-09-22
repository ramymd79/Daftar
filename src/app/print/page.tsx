"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  categorySpend,
  expenseBreakdown,
  filterTransactions,
  projectTransactions,
  statementMoney,
  supervisionDueLabel,
  txPartyName,
  txTitle,
  txTypeLabel,
  type LedgerKind,
  type LedgerSort,
} from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function PrintInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const auto = params.get("auto") === "1";

  useEffect(() => {
    if (!auto || !project) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [auto, project]);

  if (!project) return <div className="p-6">المشروع مش موجود.</div>;

  const all = projectTransactions(state, project.id);
  const minRaw = params.get("min");
  const maxRaw = params.get("max");
  const txs = filterTransactions(state, project.id, {
    query: params.get("q") || "",
    sort: (params.get("sort") as LedgerSort) || "newest",
    kind: (params.get("kind") as LedgerKind) || "all",
    categoryId: params.get("category") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    min: minRaw ? Number(minRaw) : null,
    max: maxRaw ? Number(maxRaw) : null,
  });
  const money = statementMoney(project, txs, txs.length === all.length);
  const rows = categorySpend(state.categories, txs);
  const showParty = params.get("party") === "1";
  const showNotes = params.get("notes") === "1";
  const printedAt = new Date();
  const dueHint =
    project.contractType === "percent" && project.supervisionPct
      ? `${project.supervisionPct.toLocaleString("ar-EG")}٪ من قيمة المصروفات`
      : project.contractType === "fixed"
        ? "مبلغ إشراف ثابت"
        : "";

  return (
    <div className="mx-auto max-w-3xl bg-white px-4 py-6 text-stone-900">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          تحميل PDF
        </button>
        <Link href={`/project/?id=${encodeURIComponent(project.id)}&tab=finance`} className="btn btn-secondary">
          رجوع
        </Link>
      </div>

      <header className="mb-4 border-b border-stone-200 pb-3">
        <p className="text-sm font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="text-2xl font-black">معاملات مشروع {project.name}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {formatDay(printedAt.toISOString())} ·{" "}
          {printedAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm text-stone-600">عدد المعاملات {txs.length.toLocaleString("ar-EG")}</p>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 text-center">
        <Box label="المستلم (شامل الإشراف)" hint="مدفوعات العملاء" value={formatMoney(money.received)} />
        <Box label="المصروف" hint="مشتريات ونقل وتشوين ومدفوعات المقاولين" value={formatMoney(money.spent)} />
        <Box label={supervisionDueLabel(project)} hint={dueHint} value={formatMoney(money.supervisionDue)} />
        <Box
          label="المتبقي بعد المصروف والإشراف"
          hint={money.remaining < 0 ? "مصروفات غير مغطاة ونسبة الإشراف" : "بعد المصروف والإشراف"}
          value={formatMoney(money.remaining)}
          danger={money.remaining < 0}
        />
      </section>

      <p className="mb-4 text-sm text-stone-600">
        ملخص البيانات المفلترة · إجمالي المعاملات {txs.length.toLocaleString("ar-EG")}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">توزيع المصروفات</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-right">
              <th className="py-2">البند</th>
              <th className="py-2">مشتريات</th>
              <th className="py-2">نقل وتشوين</th>
              <th className="py-2">المقاولون</th>
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
              <th className="py-2">#</th>
              <th className="py-2">الوصف</th>
              <th className="py-2">التاريخ</th>
              <th className="py-2">النوع</th>
              <th className="py-2">البند</th>
              <th className="py-2">المبلغ</th>
              {showParty ? <th className="py-2">المورد / المقاول</th> : null}
              {showNotes ? <th className="py-2">الملاحظات</th> : null}
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, index) => {
              const category = state.categories.find((item) => item.id === tx.categoryId);
              const amount = tx.type === "expense" ? expenseBreakdown(tx).total : tx.amount;
              return (
                <tr key={tx.id} className="border-b border-stone-100">
                  <td className="py-2">{(index + 1).toLocaleString("ar-EG")}</td>
                  <td className="py-2">{txTitle(tx, category?.name)}</td>
                  <td className="py-2">{formatDay(tx.date)}</td>
                  <td className="py-2">{txTypeLabel(tx)}</td>
                  <td className="py-2">{category?.name || "—"}</td>
                  <td className="py-2 font-semibold">
                    {tx.type === "client_payment" ? "+" : "−"}
                    {formatMoney(amount)}
                  </td>
                  {showParty ? <td className="py-2">{txPartyName(state, tx) || "—"}</td> : null}
                  {showNotes ? <td className="py-2">{tx.privateNotes || "—"}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Box({
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
    <div className="rounded-xl bg-stone-50 p-3">
      <p className="text-xs">{label}</p>
      <p className={`text-xl font-bold ${danger ? "text-rose-700" : ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-stone-500">{hint}</p> : null}
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
