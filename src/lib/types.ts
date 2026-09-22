export type Person = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
};

export type ProjectStatus =
  | "not_started"
  | "active"
  | "paused"
  | "done"
  | "cancelled";

export type ContractType = "contract" | "fixed" | "percent";

export type Project = {
  id: string;
  name: string;
  address?: string;
  clientId: string;
  status: ProjectStatus;
  contractType: ContractType;
  contractTotal: number;
  supervisionPct: number;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type TxType = "client_payment" | "expense";
export type PaymentClass = "expense" | "supervision";
export type ExpenseKind = "purchase" | "transport" | "labor";

export type Transaction = {
  id: string;
  projectId: string;
  type: TxType;
  amount: number;
  transportAmount?: number;
  storageAmount?: number;
  date: string;
  notes?: string;
  privateNotes?: string;
  categoryId?: string;
  paymentClass?: PaymentClass;
  expenseKind?: ExpenseKind;
  attachmentDataUrl?: string;
  contractorId?: string;
  supplierId?: string;
  createdAt: string;
};

export type Agreement = {
  id: string;
  projectId: string;
  contractorId: string;
  amount: number;
  notes?: string;
  attachmentDataUrl?: string;
  createdAt: string;
};

export type GalleryPhoto = {
  id: string;
  projectId: string;
  dataUrl: string;
  caption?: string;
  sharedWithClient: boolean;
  createdAt: string;
};

export type AppState = {
  unlocked: boolean;
  projects: Project[];
  clients: Person[];
  contractors: Person[];
  suppliers: Person[];
  categories: Category[];
  transactions: Transaction[];
  agreements: Agreement[];
  photos: GalleryPhoto[];
};
