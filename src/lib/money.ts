export function formatMoney(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = abs.toLocaleString("ar-EG");
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dayToIso(day: string): string {
  if (day.includes("T")) {
    const parsed = new Date(day);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, (month || 1) - 1, date || 1, 12, 0, 0).toISOString();
}

export function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}

export function parseUserNumber(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٪%]/g, "")
    .replace(/[٬\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/,/g, "");
  if (!normalized || normalized === "." || normalized === "-") return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function budgetFieldError(input: {
  contractType: string;
  contractTotal: string;
  supervisionPct: string;
  supervisionAmount: string;
}): string {
  const total = parseUserNumber(input.contractTotal);
  if (total == null || total <= 0) {
    return input.contractType === "contract" ? "اكتب سعر العقد" : "اكتب الميزانية";
  }
  if (input.contractType === "percent") {
    const pct = parseUserNumber(input.supervisionPct);
    if (pct == null) return "اكتب نسبة الإشراف";
    if (pct < 0 || pct > 100) return "نسبة الإشراف من ٠ إلى ١٠٠";
  }
  if (input.contractType === "fixed") {
    const amount = parseUserNumber(input.supervisionAmount);
    if (amount == null || amount < 0) return "اكتب مبلغ الإشراف";
  }
  return "";
}
