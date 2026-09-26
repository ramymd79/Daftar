"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedState, DEMO_PASSWORD } from "./seed";
import type {
  Agreement,
  Album,
  AppState,
  Category,
  ContractType,
  GalleryPhoto,
  Person,
  Project,
  ProjectStatus,
  Transaction,
} from "./types";
import { newId } from "./ids";

const STORAGE_KEY = "daftar.v6";

const CATEGORY_COLORS = [
  "#e67e22",
  "#8e44ad",
  "#2980b9",
  "#16a085",
  "#c0392b",
  "#7f8c8d",
  "#2c3e50",
];

type StoreApi = {
  ready: boolean;
  state: AppState;
  unlock: (password: string) => boolean;
  lock: () => void;
  resetDemo: () => void;
  addProject: (input: {
    name: string;
    address?: string;
    clientId?: string;
    status: ProjectStatus;
    contractType: ContractType;
    contractTotal: number;
    supervisionPct: number;
    supervisionAmount?: number | null;
  }) => string;
  updateProject: (
    id: string,
    patch: {
      name?: string;
      address?: string;
      clientId?: string;
      status?: ProjectStatus;
      contractType?: ContractType;
      contractTotal?: number;
      supervisionPct?: number;
      supervisionAmount?: number | null;
      showClientPortal?: boolean;
      showClientMoney?: boolean;
      showClientGallery?: boolean;
      showClientPrivatePhotos?: boolean;
      showClientTxNotes?: boolean;
    },
  ) => void;
  addAgreement: (input: {
    projectId: string;
    contractorId: string;
    amount: number;
    notes?: string;
    attachmentDataUrl?: string;
  }) => string;
  addClient: (input: {
    name: string;
    phone?: string;
    extraPhone?: string;
    email?: string;
    notes?: string;
    attachmentDataUrl?: string;
  }) => string;
  addContractor: (input: {
    name: string;
    phone?: string;
    extraPhone?: string;
    notes?: string;
    specialties?: string[];
    attachmentDataUrl?: string;
  }) => string;
  addSupplier: (input: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    specialties?: string[];
    attachmentDataUrl?: string;
  }) => string;
  deletePerson: (kind: "clients" | "contractors" | "suppliers", id: string) => void;
  updatePerson: (
    kind: "clients" | "contractors" | "suppliers",
    id: string,
    patch: {
      name: string;
      phone?: string;
      extraPhone?: string;
      email?: string;
      notes?: string;
      active?: boolean;
      specialties?: string[];
      attachmentDataUrl?: string;
    },
  ) => void;
  addTransaction: (
    input: Omit<Transaction, "id" | "createdAt"> & { id?: string },
  ) => string;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id" | "createdAt">>) => void;
  addCategory: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  updateAgreement: (id: string, patch: { amount?: number; notes?: string }) => void;
  addAlbum: (input: {
    projectId: string;
    name: string;
    description?: string;
    sharedWithClient: boolean;
  }) => string;
  updateAlbum: (
    albumId: string,
    patch: { name?: string; description?: string; sharedWithClient?: boolean; coverPhotoId?: string | null },
  ) => void;
  deleteProject: (id: string) => void;
  addPhoto: (input: {
    projectId: string;
    albumId?: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  updatePhotoShare: (photoId: string, sharedWithClient: boolean) => void;
  updatePhoto: (
    photoId: string,
    patch: { caption?: string; albumId?: string; sharedWithClient?: boolean; hiddenFromClient?: boolean },
  ) => void;
  deletePhoto: (photoId: string) => void;
  deleteAlbum: (albumId: string) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed?.projects?.length) return createSeedState();
    const seed = createSeedState();
    return {
      ...seed,
      ...parsed,
      unlocked: !!parsed.unlocked,
      agreements: parsed.agreements || [],
      albums: parsed.albums ?? seed.albums,
      projects: parsed.projects.map((project) => ({
        ...project,
        contractType: project.contractType || "fixed",
        supervisionPct: project.supervisionPct || 0,
        contractTotal: project.contractTotal || 0,
        showClientPortal: project.showClientPortal !== false,
        showClientMoney: project.showClientMoney !== false,
        showClientGallery: project.showClientGallery !== false,
        showClientPrivatePhotos: project.showClientPrivatePhotos === true,
        showClientTxNotes: project.showClientTxNotes === true,
      })),
    };
  } catch {
    return createSeedState();
  }
}

function persist(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(createSeedState);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    persist(state);
  }, [ready, state]);

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      unlock: (password) => {
        if (password.trim() !== DEMO_PASSWORD) return false;
        setState((prev) => ({ ...prev, unlocked: true }));
        return true;
      },
      lock: () => setState((prev) => ({ ...prev, unlocked: false })),
      resetDemo: () => {
        const fresh = createSeedState();
        fresh.unlocked = true;
        setState(fresh);
      },
      addProject: (input) => {
        const id = newId("prj");
        const project: Project = {
          id,
          name: input.name.trim(),
          address: input.address?.trim() || undefined,
          clientId: input.clientId?.trim() || "",
          status: input.status,
          contractType: input.contractType,
          contractTotal: input.contractTotal,
          supervisionPct: input.supervisionPct,
          supervisionAmount:
            typeof input.supervisionAmount === "number" ? input.supervisionAmount : undefined,
          showClientPortal: true,
          showClientMoney: true,
          showClientGallery: true,
          showClientPrivatePhotos: false,
          showClientTxNotes: false,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          projects: [project, ...prev.projects],
        }));
        return id;
      },
      deleteProject: (id) => {
        setState((prev) => ({
          ...prev,
          projects: prev.projects.filter((project) => project.id !== id),
          transactions: prev.transactions.filter((tx) => tx.projectId !== id),
          agreements: prev.agreements.filter((item) => item.projectId !== id),
          albums: (prev.albums || []).filter((album) => album.projectId !== id),
          photos: prev.photos.filter((photo) => photo.projectId !== id),
        }));
      },
      updateProject: (id, patch) => {
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((project) => {
            if (project.id !== id) return project;
            return {
              ...project,
              ...patch,
              name: patch.name !== undefined ? patch.name.trim() : project.name,
              address:
                patch.address !== undefined
                  ? patch.address.trim() || undefined
                  : project.address,
              supervisionAmount:
                patch.supervisionAmount === null
                  ? undefined
                  : patch.supervisionAmount !== undefined
                    ? patch.supervisionAmount
                    : project.supervisionAmount,
            };
          }),
        }));
      },
      addAgreement: (input) => {
        const id = newId("agr");
        const agreement: Agreement = {
          id,
          projectId: input.projectId,
          contractorId: input.contractorId,
          amount: input.amount,
          notes: input.notes?.trim() || undefined,
          attachmentDataUrl: input.attachmentDataUrl,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          agreements: [agreement, ...(prev.agreements || [])],
        }));
        return id;
      },
      updateAgreement: (id, patch) => {
        setState((prev) => ({
          ...prev,
          agreements: (prev.agreements || []).map((item) =>
            item.id === id
              ? {
                  ...item,
                  amount: patch.amount !== undefined ? patch.amount : item.amount,
                  notes: patch.notes !== undefined ? patch.notes.trim() || undefined : item.notes,
                }
              : item,
          ),
        }));
      },
      addClient: (input) => {
        const id = newId("cli");
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
          extraPhone: input.extraPhone?.trim() || undefined,
          email: input.email?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          attachmentDataUrl: input.attachmentDataUrl || undefined,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({ ...prev, clients: [person, ...prev.clients] }));
        return id;
      },
      addContractor: (input) => {
        const id = newId("ctr");
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
          extraPhone: input.extraPhone?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          specialties: input.specialties?.filter(Boolean),
          attachmentDataUrl: input.attachmentDataUrl || undefined,
        };
        setState((prev) => ({
          ...prev,
          contractors: [person, ...prev.contractors],
        }));
        return id;
      },
      updatePerson: (kind, id, patch) => {
        const name = patch.name.trim();
        if (!name) return;
        setState((prev) => ({
          ...prev,
          [kind]: prev[kind].map((person) => {
            if (person.id !== id) return person;
            const next: Person = { ...person, name };
            if ("phone" in patch) next.phone = patch.phone?.trim() || undefined;
            if ("extraPhone" in patch) next.extraPhone = patch.extraPhone?.trim() || undefined;
            if ("email" in patch) next.email = patch.email?.trim() || undefined;
            if ("notes" in patch) next.notes = patch.notes?.trim() || undefined;
            if ("active" in patch) next.active = patch.active;
            if ("specialties" in patch) next.specialties = patch.specialties?.filter(Boolean);
            if ("attachmentDataUrl" in patch) next.attachmentDataUrl = patch.attachmentDataUrl || undefined;
            return next;
          }),
        }));
      },
      addSupplier: (input) => {
        const id = newId("sup");
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
          email: input.email?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          specialties: input.specialties?.filter(Boolean),
          attachmentDataUrl: input.attachmentDataUrl || undefined,
        };
        setState((prev) => ({
          ...prev,
          suppliers: [person, ...prev.suppliers],
        }));
        return id;
      },
      deletePerson: (kind, id) => {
        setState((prev) => ({
          ...prev,
          [kind]: prev[kind].filter((person) => person.id !== id),
        }));
      },
      addTransaction: (input) => {
        const id = input.id || newId("tx");
        const tx: Transaction = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          transactions: [tx, ...prev.transactions],
        }));
        return id;
      },
      deleteTransaction: (id) => {
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((tx) => tx.id !== id),
        }));
      },
      updateTransaction: (id, patch) => {
        setState((prev) => ({
          ...prev,
          transactions: prev.transactions.map((tx) => (tx.id === id ? { ...tx, ...patch, id: tx.id, createdAt: tx.createdAt } : tx)),
        }));
      },
      addCategory: (name) => {
        const trimmed = name.trim();
        const id = newId("cat");
        const category: Category = {
          id,
          name: trimmed,
          color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
        };
        setState((prev) => {
          if (!trimmed) return prev;
          if (prev.categories.some((item) => item.name === trimmed)) return prev;
          const color =
            CATEGORY_COLORS[prev.categories.length % CATEGORY_COLORS.length];
          return {
            ...prev,
            categories: [...prev.categories, { ...category, color }],
          };
        });
        return id;
      },
      renameCategory: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setState((prev) => ({
          ...prev,
          categories: prev.categories.map((item) =>
            item.id === id ? { ...item, name: trimmed } : item,
          ),
        }));
      },
      deleteCategory: (id) => {
        setState((prev) => ({
          ...prev,
          categories: prev.categories.filter((item) => item.id !== id),
        }));
      },
      addAlbum: (input) => {
        const id = newId("alb");
        const album: Album = {
          id,
          projectId: input.projectId,
          name: input.name.trim(),
          description: input.description?.trim() || undefined,
          sharedWithClient: input.sharedWithClient,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({ ...prev, albums: [album, ...(prev.albums || [])] }));
        return id;
      },
      updateAlbum: (albumId, patch) => {
        setState((prev) => ({
          ...prev,
          albums: (prev.albums || []).map((album) =>
            album.id === albumId
              ? {
                  ...album,
                  ...patch,
                  name: patch.name !== undefined ? patch.name.trim() : album.name,
                  description:
                    patch.description !== undefined
                      ? patch.description.trim() || undefined
                      : album.description,
                  coverPhotoId:
                    patch.coverPhotoId === null
                      ? undefined
                      : patch.coverPhotoId !== undefined
                        ? patch.coverPhotoId
                        : album.coverPhotoId,
                }
              : album,
          ),
        }));
      },
      addPhoto: (input) => {
        const id = newId("ph");
        const photo: GalleryPhoto = {
          id,
          projectId: input.projectId,
          albumId: input.albumId,
          dataUrl: input.dataUrl,
          caption: input.caption?.trim() || undefined,
          sharedWithClient: true,
          hiddenFromClient: false,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({ ...prev, photos: [photo, ...prev.photos] }));
        return id;
      },
      updatePhotoShare: (photoId, sharedWithClient) => {
        setState((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId ? { ...p, sharedWithClient } : p,
          ),
        }));
      },
      updatePhoto: (photoId, patch) => {
        setState((prev) => ({
          ...prev,
          photos: prev.photos.map((photo) =>
            photo.id === photoId
              ? {
                  ...photo,
                  ...patch,
                  caption: patch.caption !== undefined ? patch.caption.trim() || undefined : photo.caption,
                }
              : photo,
          ),
        }));
      },
      deletePhoto: (photoId) => {
        setState((prev) => ({
          ...prev,
          photos: prev.photos.filter((photo) => photo.id !== photoId),
          albums: (prev.albums || []).map((album) =>
            album.coverPhotoId === photoId ? { ...album, coverPhotoId: undefined } : album,
          ),
        }));
      },
      deleteAlbum: (albumId) => {
        setState((prev) => ({
          ...prev,
          albums: (prev.albums || []).filter((album) => album.id !== albumId),
          photos: prev.photos.map((photo) =>
            photo.albumId === albumId ? { ...photo, albumId: undefined } : photo,
          ),
        }));
      },
    }),
    [ready, state],
  );

  return (
    <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
