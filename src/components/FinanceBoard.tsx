"use client";

import {
  expensesByCategory,
  projectMoney,
  supervisionDueLabel,
} from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import type { AppState } from "@/lib/types";

export function FinanceBoard({
  state,
  projectId,
}: {
  state: AppState;
  projectId: string;
}) {
  const project = state.projects.find((item) => item.id === projectId);
  const money = projectMoney(state, projectId);
  const rows = expensesByCategory(state, projectId);
  const budget = project?.contractTotal || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MoneyCard
          label="المستلم (شامل الإشراف)"
          value={formatMoney(money.received)}
          tone="green"
          hint={budget > 0 ? `من أصل ${formatMoney(budget)}` : undefined}
        />
        <MoneyCard
          label="المتبقي بعد المصروف والإشراف"
          value={formatMoney(money.remaining)}
          tone={money.remaining < 0 ? "rose" : "green"}
        />
        <MoneyCard label="المصروف" value={formatMoney(money.spent)} />
        <MoneyCard
          label={supervisionDueLabel(project)}
          value={formatMoney(money.supervisionDue)}
          tone="rose"
        />
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
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-bold">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: row.category.color }}
                      />
                      {row.category.name}
                    </span>
                    <span className="font-black">
                      ({row.pct.toFixed(1)}%) {formatMoney(row.amount)}
                    </span>
                  </div>
                  <div className="h-1" style={{ background: row.category.color }} />
                  <div className="grid grid-cols-3 bg-stone-50 text-center text-xs">
                    <KindCell label="مشتريات" value={row.purchase} />
                    <KindCell label="نقل وتشوين" value={row.transport} />
                    <KindCell label="مقاولين" value={row.labor} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  hint,
  tone = "stone",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "stone" | "green" | "rose";
}) {
  const valueColor =
    tone === "green" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-stone-900";
  return (
    <div className="rounded-2xl bg-white px-3 py-4 text-center">
      <p className="text-xs leading-snug text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${valueColor}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-stone-400">{hint}</p> : null}
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
