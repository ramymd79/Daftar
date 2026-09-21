import type { Project } from "./types";

export function sumPayments(project: Project): number {
  return project.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

export function sumExpenses(project: Project): number {
  return project.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

/** المتبقي = مدفوعات العميل المسجلة − مصروفات المشروع المسجلة */
export function remainingCash(project: Project): number {
  return sumPayments(project) - sumExpenses(project);
}

export function officeProfit(project: Project): number {
  const expenses = sumExpenses(project);
  const payments = sumPayments(project);

  switch (project.profitMode) {
    case "percent":
      return expenses * ((Number(project.profitPercent) || 0) / 100);
    case "fixed_fee":
      return Number(project.fixedFee) || 0;
    case "fixed_price": {
      const price = Number(project.contractPrice) || 0;
      return price - expenses;
    }
    default:
      return payments - expenses;
  }
}

export function formatEgp(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return (
    new Intl.NumberFormat("ar-EG", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(Math.round(value)) + " ج.م"
  );
}

export function expensesByCategory(project: Project) {
  const map = new Map<string, number>();
  for (const e of project.expenses) {
    map.set(e.category, (map.get(e.category) || 0) + (Number(e.amount) || 0));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
