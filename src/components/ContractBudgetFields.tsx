import { contractTypeLabel } from "@/lib/logic";
import type { ContractType } from "@/lib/types";

const types: ContractType[] = ["percent", "fixed", "contract"];

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

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">
        نوع التعاقد <span className="text-rose-600">مطلوب</span>
      </p>
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

      <label className="block text-sm font-semibold">
        {totalLabel} <span className="text-rose-600">مطلوب</span>
        <input
          className="input mt-1"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder={contractType === "contract" ? "مثال: ٧٥٠٠٠٠" : "أدخل المبلغ"}
          value={contractTotal}
          onChange={(e) => onContractTotal(e.target.value)}
          required
        />
      </label>
      {contractType === "contract" ? (
        <p className="text-xs text-stone-500">صافي العقد = سعر العقد − إجمالي المصروفات</p>
      ) : null}

      {contractType === "percent" ? (
        <label className="block text-sm font-semibold">
          نسبة الإشراف <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            placeholder="مثال: ١٠"
            value={supervisionPct}
            onChange={(e) => onSupervisionPct(e.target.value)}
            required
          />
        </label>
      ) : null}

      {contractType === "fixed" ? (
        <label className="block text-sm font-semibold">
          مبلغ الإشراف الثابت <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="مثال: ٥٠٠٠٠"
            value={supervisionAmount}
            onChange={(e) => onSupervisionAmount(e.target.value)}
            required
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            مبلغ الإشراف ثابت بغض النظر عن المصروفات
          </span>
        </label>
      ) : null}
    </div>
  );
}
