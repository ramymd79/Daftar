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
