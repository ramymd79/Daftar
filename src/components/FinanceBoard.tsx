"use client";

import { expensesByCategory, projectMoney } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import type { AppState } from "@/lib/types";

export function FinanceBoard({
  state,
  projectId,
  onDelete,
}: {
  state: AppState;
  projectId: string;
  onDelete?: (id: string) => void;
}) {
  const money = projectMoney(state, projectId);
  const rows = expensesByCategory(state, projectId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white text-center">
        <div className="px-3 py-4">
          <p className="text-xs text-stone-500">مستلم</p>
          <p className="mt-1 text-2xl font-black">{formatMoney(money.received)}</p>
        </div>
        <div className="border-s border-stone-100 px-3 py-4">
          <p className="text-xs text-stone-500">مصروف</p>
          <p className="mt-1 text-2xl font-black text-[#b4533a]">{formatMoney(money.spent)}</p>
        </div>
      </div>

      {money.uncovered > 0 ? (
        <div className="rounded-2xl bg-rose-100 px-4 py-3 text-center text-sm font-bold text-rose-800">
          مصروفات غير مغطاة بمبلغ {formatMoney(money.uncovered)}
        </div>
      ) : null}

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">توزيع المصروفات</h2>
          <p className="text-lg font-black">{formatMoney(money.spent)}</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">لسه مفيش مصروفات.</p>
        ) : (
          <>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-stone-100">
              {rows.map((row) => (
                <div
                  key={row.category.id}
                  style={{ width: `${row.pct}%`, background: row.category.color }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {rows.map((row) => (
                <article key={row.category.id} className="overflow-hidden rounded-2xl border border-stone-100">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold">
                      {row.category.name}
                    </span>
                    <span className="font-black">
                      ({row.pct.toFixed(0)}%) {formatMoney(row.amount)}
                    </span>
                  </div>
                  <div className="h-1" style={{ background: row.category.color }} />
                  <div className="grid grid-cols-3 bg-stone-50 text-center text-xs">
                    <KindCell label="مشتريات" value={row.purchase} />
                    <KindCell label="نقل وتخزين" value={row.transport} />
                    <KindCell label="مقاولين" value={row.labor} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-black">الحركات</h2>
        {money.txs.length === 0 ? (
          <p className="text-sm text-stone-500">لسه مفيش حركات.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {money.txs.map((tx) => {
              const category = state.categories.find((item) => item.id === tx.categoryId);
              const kind =
                tx.expenseKind === "labor"
                  ? "مقاولين"
                  : tx.expenseKind === "transport"
                    ? "نقل وتخزين"
                    : tx.expenseKind === "purchase"
                      ? "مشتريات"
                      : "";
              return (
                <li key={tx.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {tx.type === "client_payment"
                          ? tx.notes || "دفعة من العميل"
                          : tx.notes || category?.name || "مصروف"}
                      </p>
                      <p className="text-stone-500">
                        {formatDay(tx.date)}
                        {tx.type === "client_payment"
                          ? tx.paymentClass === "supervision"
                            ? " · من نسبة الإشراف"
                            : " · من المصروفات"
                          : category
                            ? ` · ${category.name}${kind ? ` · ${kind}` : ""}`
                            : ""}
                      </p>
                      {tx.privateNotes ? (
                        <p className="mt-1 text-xs text-stone-400">ملاحظة خاصة: {tx.privateNotes}</p>
                      ) : null}
                    </div>
                    <p
                      className={`font-bold ${
                        tx.type === "client_payment" ? "text-emerald-700" : "text-[#b4533a]"
                      }`}
                    >
                      {tx.type === "client_payment" ? "+" : "−"}
                      {formatMoney(tx.amount)}
                    </p>
                  </div>
                  {onDelete ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-rose-600"
                      onClick={() => {
                        if (window.confirm("تحذف الحركة دي؟")) onDelete(tx.id);
                      }}
                    >
                      حذف
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KindCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-1 py-2">
      <p className="text-stone-500">{label}</p>
      <p className="mt-1 font-bold">{value > 0 ? formatMoney(value) : "—"}</p>
    </div>
  );
}
