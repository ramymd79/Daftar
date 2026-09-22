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
    clientId: string;
    status: ProjectStatus;
    contractType: ContractType;
    contractTotal: number;
    supervisionPct: number;
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
  addClient: (input: { name: string; phone?: string }) => string;
  addContractor: (input: { name: string; phone?: string }) => string;
  addSupplier: (input: { name: string; phone?: string }) => string;
  addTransaction: (
    input: Omit<Transaction, "id" | "createdAt"> & { id?: string },
  ) => string;
  deleteTransaction: (id: string) => void;
  addCategory: (name: string) => string;
  addAlbum: (input: {
    projectId: string;
    name: string;
    description?: string;
    sharedWithClient: boolean;
  }) => string;
  updateAlbum: (
    albumId: string,
    patch: { name?: string; description?: string; sharedWithClient?: boolean },
  ) => void;
  addPhoto: (input: {
    projectId: string;
    albumId?: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  updatePhotoShare: (photoId: string, sharedWithClient: boolean) => void;
  deletePhoto: (photoId: string) => void;
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
          clientId: input.clientId,
          status: input.status,
          contractType: input.contractType,
          contractTotal: input.contractTotal,
          supervisionPct: input.supervisionPct,
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
      addClient: (input) => {
        const id = newId("cli");
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
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
        };
        setState((prev) => ({
          ...prev,
          contractors: [person, ...prev.contractors],
        }));
        return id;
      },
      addSupplier: (input) => {
        const id = newId("sup");
        const person: Person = {
          id,
          name: input.name.trim(),
          phone: input.phone?.trim() || undefined,
        };
        setState((prev) => ({
          ...prev,
          suppliers: [person, ...prev.suppliers],
        }));
        return id;
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
          sharedWithClient: input.sharedWithClient ?? true,
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
      deletePhoto: (photoId) => {
        setState((prev) => ({
          ...prev,
          photos: prev.photos.filter((photo) => photo.id !== photoId),
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
