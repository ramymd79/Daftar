"use client";

import { formatMoney } from "@/lib/money";

export function SummaryCards({
  received,
  spent,
  remaining,
  contractTotal,
}: {
  received: number;
  spent: number;
  remaining: number;
  contractTotal?: number;
}) {
  const agreementLeft =
    typeof contractTotal === "number" ? contractTotal - received : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="مستلم" value={formatMoney(received)} tone="emerald" />
        <Stat label="مصروف" value={formatMoney(spent)} tone="sky" />
        <Stat
          label="متبقي"
          value={formatMoney(remaining)}
          tone={remaining < 0 ? "rose" : "stone"}
        />
      </div>
      {typeof contractTotal === "number" && contractTotal > 0 ? (
        <p className="rounded-2xl bg-white px-3 py-2 text-sm text-stone-600">
          قيمة الاتفاق {formatMoney(contractTotal)}
          {agreementLeft !== null ? (
            <>
              {" "}
              · لسه على العميل {formatMoney(Math.max(agreementLeft, 0))}
            </>
          ) : null}
        </p>
      ) : null}
      {remaining < 0 ? (
        <p className="text-sm font-semibold text-rose-700">
          المصروف أكبر من اللي استلمته.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "stone" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-900",
    sky: "bg-sky-50 text-sky-900",
    stone: "bg-white text-stone-900",
    rose: "bg-rose-50 text-rose-800",
  };
  return (
    <div className={`rounded-2xl px-2 py-3 text-center ${tones[tone]}`}>
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-lg font-black leading-tight">{value}</p>
    </div>
  );
}
