import { sumBy } from "./money";
import type {
  AppState,
  Category,
  ExpenseKind,
  ProjectStatus,
  Transaction,
} from "./types";

export function projectTransactions(
  state: AppState,
  projectId: string,
): Transaction[] {
  return state.transactions
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function projectMoney(state: AppState, projectId: string) {
  const txs = projectTransactions(state, projectId);
  const payments = txs.filter((t) => t.type === "client_payment");
  const expenses = txs.filter((t) => t.type === "expense");
  const received = sumBy(payments, (t) => t.amount);
  const spent = sumBy(expenses, (t) => t.amount);
  const receivedForExpenses = sumBy(
    payments.filter((t) => t.paymentClass !== "supervision"),
    (t) => t.amount,
  );
  const project = state.projects.find((item) => item.id === projectId);
  const supervisionDue = project
    ? Math.round((received * (project.supervisionPct || 0)) / 100)
    : 0;
  const uncovered = Math.max(0, spent - receivedForExpenses);
  const remaining = received - spent - supervisionDue;
  return {
    received,
    spent,
    receivedForExpenses,
    supervisionDue,
    uncovered,
    remaining,
    txs,
  };
}

export function projectTotals(state: AppState, projectId: string) {
  return projectMoney(state, projectId);
}

export type CategorySpend = {
  category: Category;
  amount: number;
  pct: number;
  purchase: number;
  transport: number;
  labor: number;
};

function kindOf(tx: Transaction): ExpenseKind {
  return tx.expenseKind || "purchase";
}

export function expensesByCategory(
  state: AppState,
  projectId: string,
): CategorySpend[] {
  const { spent, txs } = projectMoney(state, projectId);
  const map = new Map<string, { purchase: number; transport: number; labor: number }>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const key = tx.categoryId || "cat_other";
    const row = map.get(key) || { purchase: 0, transport: 0, labor: 0 };
    row[kindOf(tx)] += tx.amount;
    map.set(key, row);
  }
  return state.categories
    .map((category) => {
      const row = map.get(category.id) || { purchase: 0, transport: 0, labor: 0 };
      const amount = row.purchase + row.transport + row.labor;
      return {
        category,
        amount,
        pct: spent > 0 ? (amount / spent) * 100 : 0,
        ...row,
      };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function statusLabel(status: ProjectStatus | string): string {
  if (status === "not_started") return "لم يبدأ";
  if (status === "paused") return "معلق";
  if (status === "done") return "مكتمل";
  if (status === "cancelled") return "ملغي";
  return "قيد التنفيذ";
}

export function contractTypeLabel(type: string): string {
  if (type === "contract") return "عقد مقاولة";
  if (type === "percent") return "نسبة مئوية";
  return "مبلغ ثابت";
}

export function expensesForPerson(
  state: AppState,
  key: "contractorId" | "supplierId",
  personId: string,
  projectId?: string,
): Transaction[] {
  return state.transactions
    .filter(
      (tx) =>
        tx.type === "expense" &&
        tx[key] === personId &&
        (!projectId || tx.projectId === projectId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
