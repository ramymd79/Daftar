export type Person = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
};

export type ProjectStatus = "active" | "paused" | "done";

export type Project = {
  id: string;
  name: string;
  address?: string;
  clientId: string;
  status: ProjectStatus;
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

export type Transaction = {
  id: string;
  projectId: string;
  type: TxType;
  amount: number;
  date: string;
  notes?: string;
  privateNotes?: string;
  categoryId?: string;
  attachmentDataUrl?: string;
  contractorId?: string;
  supplierId?: string;
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
  photos: GalleryPhoto[];
};
