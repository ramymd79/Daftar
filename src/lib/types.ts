export type ProfitMode = "percent" | "fixed_fee" | "fixed_price";

export type ExpenseCategory =
  | "plumbing"
  | "electrical"
  | "painting"
  | "plaster"
  | "tiling"
  | "carpentry"
  | "other";

export type Payment = {
  id: string;
  date: string;
  amount: number;
  note: string;
};

export type Expense = {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
  /** Optional data-URL receipt photo for the local demo */
  photoDataUrl?: string;
};

export type Project = {
  id: string;
  name: string;
  clientName: string;
  address: string;
  status: "active" | "paused" | "done";
  profitMode: ProfitMode;
  /** Used when profitMode is percent (e.g. 15 = 15%) */
  profitPercent: number;
  /** Used when profitMode is fixed_fee */
  fixedFee: number;
  /** Contract price when profitMode is fixed_price */
  contractPrice: number;
  payments: Payment[];
  expenses: Expense[];
  createdAt: string;
};

export type DaftarStore = {
  version: 1;
  projects: Project[];
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  plumbing: "سباكة",
  electrical: "كهرباء",
  painting: "نقاشة",
  plaster: "محارة",
  tiling: "سيراميك",
  carpentry: "نجارة",
  other: "أخرى",
};

export const PROFIT_MODE_LABELS: Record<ProfitMode, string> = {
  percent: "نسبة من المصروفات",
  fixed_fee: "مبلغ ثابت للمكتب",
  fixed_price: "مقاولة بسعر متفق عليه",
};
