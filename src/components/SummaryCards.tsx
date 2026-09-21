"use client";

import { formatMoney } from "@/lib/money";

export function SummaryCards({
  received,
  spent,
  remaining,
  contractTotal,
  supervisionDue,
  supervisionPct,
}: {
  received: number;
  spent: number;
  remaining: number;
  contractTotal?: number;
  supervisionDue?: number;
  supervisionPct?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl bg-emerald-50 px-3 py-3">
        <p className="text-xs text-emerald-800">
          المستلم
          {contractTotal
            ? ` من أصل ${formatMoney(contractTotal)}`
            : ""}
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-900">
          {formatMoney(received)}
        </p>
      </div>
      <div className="rounded-2xl bg-rose-50 px-3 py-3">
        <p className="text-xs text-rose-800">المتبقي بعد المصروف</p>
        <p
          className={`mt-1 text-2xl font-bold ${
            remaining < 0 ? "text-rose-700" : "text-rose-900"
          }`}
        >
          {formatMoney(remaining)}
        </p>
      </div>
      <div className="rounded-2xl bg-sky-50 px-3 py-3">
        <p className="text-xs text-sky-800">المصروف</p>
        <p className="mt-1 text-2xl font-bold text-sky-900">
          {formatMoney(spent)}
        </p>
      </div>
      <div className="rounded-2xl bg-amber-50 px-3 py-3">
        <p className="text-xs text-amber-800">
          نسبة الإشراف
          {typeof supervisionPct === "number" ? ` (${supervisionPct}%)` : ""}
        </p>
        <p className="mt-1 text-2xl font-bold text-amber-900">
          {formatMoney(supervisionDue || 0)}
        </p>
      </div>
    </div>
  );
}
