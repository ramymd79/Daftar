import { sumBy } from "./money";
import type {
  AppState,
  Category,
  Project,
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

export function expenseBreakdown(tx: Transaction): {
  purchase: number;
  transport: number;
  labor: number;
  total: number;
} {
  const hasSplit =
    typeof tx.transportAmount === "number" || typeof tx.storageAmount === "number";
  if (hasSplit) {
    const purchase = tx.amount || 0;
    const transport = (tx.transportAmount || 0) + (tx.storageAmount || 0);
    return { purchase, transport, labor: 0, total: purchase + transport };
  }
  const amount = tx.amount || 0;
  const kind = tx.expenseKind || "purchase";
  return {
    purchase: kind === "purchase" ? amount : 0,
    transport: kind === "transport" ? amount : 0,
    labor: kind === "labor" ? amount : 0,
    total: amount,
  };
}

export function projectMoney(state: AppState, projectId: string) {
  const txs = projectTransactions(state, projectId);
  const payments = txs.filter((t) => t.type === "client_payment");
  const expenses = txs.filter((t) => t.type === "expense");
  /** المستلم (شامل الإشراف): كل دفعات العميل بما فيها تصنيف الإشراف */
  const received = sumBy(payments, (t) => t.amount);
  const supervisionReceived = sumBy(
    payments.filter((t) => t.paymentClass === "supervision"),
    (t) => t.amount,
  );
  const spent = sumBy(expenses, (t) => expenseBreakdown(t).total);
  const project = state.projects.find((item) => item.id === projectId);
  const supervisionTarget = supervisionTargetOf(project);
  const supervisionDue = supervisionDueOf(project, spent);
  const remaining = received - spent - supervisionDue;
  const uncovered = remaining < 0 ? Math.abs(remaining) : 0;
  return {
    received,
    spent,
    supervisionReceived,
    supervisionTarget,
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
    const parts = expenseBreakdown(tx);
    row.purchase += parts.purchase;
    row.transport += parts.transport;
    row.labor += parts.labor;
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

export function supervisionTargetOf(project?: Project): number {
  if (!project || project.contractType === "contract") return 0;
  if (project.contractType === "fixed" && typeof project.supervisionAmount === "number") {
    return project.supervisionAmount;
  }
  return Math.round(((project.contractTotal || 0) * (project.supervisionPct || 0)) / 100);
}

/** الإشراف المستحق على لوحة المالية: نسبة من المصروف، أو مبلغ ثابت، أو صفر لعقد المقاولة */
export function supervisionDueOf(project: Project | undefined, spent: number): number {
  if (!project || project.contractType === "contract") return 0;
  if (project.contractType === "fixed") {
    if (typeof project.supervisionAmount === "number") return project.supervisionAmount;
    return supervisionTargetOf(project);
  }
  return Math.round((spent * (project.supervisionPct || 0)) / 100);
}

export function supervisionDueLabel(project?: Project): string {
  if (project?.contractType === "fixed") return "مبلغ الإشراف المستحق";
  if (project?.contractType === "percent" && (project.supervisionPct || 0) > 0) {
    return `نسبة الإشراف المستحقة (${(project.supervisionPct || 0).toLocaleString("ar-EG")}٪)`;
  }
  return "نسبة الإشراف المستحقة";
}

export function supervisionBasisWord(project?: Project): string {
  return project?.contractType === "fixed" ? "مبلغ إشراف" : "نسبة إشراف";
}

export type LedgerSort =
  | "newest"
  | "oldest"
  | "amount_desc"
  | "amount_asc"
  | "type_purchase"
  | "type_client"
  | "category_az"
  | "category_za";

export type LedgerKind = "all" | "purchase" | "client" | "contractor";

export function txAmount(tx: Transaction): number {
  return tx.type === "expense" ? expenseBreakdown(tx).total : tx.amount;
}

export function txKind(tx: Transaction): Exclude<LedgerKind, "all"> {
  if (tx.type === "client_payment") return "client";
  if (tx.expenseKind === "labor" || tx.contractorId) return "contractor";
  return "purchase";
}

export function filterTransactions(
  state: AppState,
  projectId: string,
  options: { query?: string; sort?: LedgerSort; kind?: LedgerKind; categoryId?: string },
): Transaction[] {
  const query = (options.query || "").trim();
  const sort = options.sort || "newest";
  const kind = options.kind || "all";
  const categoryId = options.categoryId || "";
  let rows = projectTransactions(state, projectId).filter((tx) => {
    if (kind !== "all" && txKind(tx) !== kind) return false;
    if (categoryId && tx.categoryId !== categoryId) return false;
    if (!query) return true;
    const category = state.categories.find((item) => item.id === tx.categoryId);
    const haystack = `${tx.notes || ""} ${tx.privateNotes || ""} ${category?.name || ""}`;
    return haystack.includes(query);
  });
  const categoryName = (tx: Transaction) =>
    state.categories.find((item) => item.id === tx.categoryId)?.name || "";
  rows = [...rows].sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date);
    if (sort === "amount_desc") return txAmount(b) - txAmount(a);
    if (sort === "amount_asc") return txAmount(a) - txAmount(b);
    if (sort === "type_purchase") return Number(txKind(b) === "purchase") - Number(txKind(a) === "purchase");
    if (sort === "type_client") return Number(txKind(b) === "client") - Number(txKind(a) === "client");
    if (sort === "category_az") return categoryName(a).localeCompare(categoryName(b), "ar");
    if (sort === "category_za") return categoryName(b).localeCompare(categoryName(a), "ar");
    return b.date.localeCompare(a.date);
  });
  return rows;
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
