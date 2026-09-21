import { sumBy } from "./money";
import type { AppState, Category, Transaction } from "./types";

export function projectTransactions(
  state: AppState,
  projectId: string,
): Transaction[] {
  return state.transactions
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function projectTotals(state: AppState, projectId: string) {
  const txs = projectTransactions(state, projectId);
  const received = sumBy(
    txs.filter((t) => t.type === "client_payment"),
    (t) => t.amount,
  );
  const spent = sumBy(
    txs.filter((t) => t.type === "expense"),
    (t) => t.amount,
  );
  const remaining = received - spent;
  const project = state.projects.find((p) => p.id === projectId);
  const supervisionDue = project
    ? Math.round((received * project.supervisionPct) / 100)
    : 0;
  return { received, spent, remaining, supervisionDue, txs };
}

export type CategorySpend = {
  category: Category;
  amount: number;
  pct: number;
};

export function expensesByCategory(
  state: AppState,
  projectId: string,
): CategorySpend[] {
  const { spent, txs } = projectTotals(state, projectId);
  const map = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const key = tx.categoryId || "cat_other";
    map.set(key, (map.get(key) || 0) + tx.amount);
  }
  return state.categories
    .map((category) => {
      const amount = map.get(category.id) || 0;
      return {
        category,
        amount,
        pct: spent > 0 ? (amount / spent) * 100 : 0,
      };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function statusLabel(status: string): string {
  if (status === "done") return "منتهي";
  if (status === "paused") return "متوقف";
  return "جارٍ";
}
