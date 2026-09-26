import { contractTypeLabel } from "@/lib/logic";
import type { ContractType } from "@/lib/types";

const types: ContractType[] = ["percent", "fixed", "contract"];

function FieldHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="mb-1 flex items-center justify-between text-sm font-bold">
      <span>{label}</span>
      <span className="font-normal text-stone-400">{hint}</span>
    </span>
  );
}

export function ContractBudgetFields({
  contractType,
  onContractType,
  contractTotal,
  onContractTotal,
  supervisionPct,
  onSupervisionPct,
  supervisionAmount,
  onSupervisionAmount,
}: {
  contractType: ContractType;
  onContractType: (type: ContractType) => void;
  contractTotal: string;
  onContractTotal: (value: string) => void;
  supervisionPct: string;
  onSupervisionPct: (value: string) => void;
  supervisionAmount: string;
  onSupervisionAmount: (value: string) => void;
}) {
  const totalLabel = contractType === "contract" ? "سعر العقد الإجمالي" : "الميزانية الإجمالية";
  const totalPlaceholder =
    contractType === "contract" ? "مثال: ٧٥٠,٠٠٠" : "مثال: ٥٠٠,٠٠٠";

  return (
    <div className="space-y-3">
      <div>
        <FieldHint label="نوع التعاقد" hint="مطلوب" />
        <div className="grid grid-cols-3 gap-2">
          {types.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-2xl border px-2 py-3 text-sm font-bold ${
                contractType === item
                  ? "border-[var(--brand)] bg-[#f3e6dc] text-[var(--brand-dark)]"
                  : "border-stone-200 bg-white"
              }`}
              onClick={() => onContractType(item)}
            >
              {contractTypeLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <FieldHint label={totalLabel} hint="مطلوب" />
        <input
          key="contract-total"
          className="input"
          inputMode="decimal"
          placeholder={totalPlaceholder}
          value={contractTotal}
          onChange={(e) => onContractTotal(e.target.value)}
        />
      </label>
      {contractType === "contract" ? (
        <p className="text-xs text-stone-500">صافي العقد = سعر العقد − إجمالي المصروفات</p>
      ) : null}

      {contractType === "percent" ? (
        <label className="block">
          <FieldHint label="نسبة الإشراف" hint="مطلوب" />
          <div className="relative">
            <input
              key="supervision-pct"
              className="input pe-10"
              inputMode="decimal"
              placeholder="١٥"
              value={supervisionPct}
              onChange={(e) => onSupervisionPct(e.target.value)}
            />
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
              %
            </span>
          </div>
        </label>
      ) : null}

      {contractType === "fixed" ? (
        <label className="block">
          <FieldHint label="مبلغ الإشراف الثابت" hint="مطلوب" />
          <input
            key="supervision-amount"
            className="input"
            inputMode="decimal"
            placeholder="مثال: ٥٠,٠٠٠"
            value={supervisionAmount}
            onChange={(e) => onSupervisionAmount(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            مبلغ الإشراف ثابت بغض النظر عن المصروفات
          </span>
        </label>
      ) : null}
    </div>
  );
}
