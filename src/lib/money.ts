export function formatMoney(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = abs.toLocaleString("ar-EG");
  return value < 0 ? `-${formatted}` : formatted;
}

export function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}
