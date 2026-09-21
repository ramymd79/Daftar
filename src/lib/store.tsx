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
  AppState,
  GalleryPhoto,
  Person,
  Project,
  Transaction,
} from "./types";
import { newId } from "./ids";

const STORAGE_KEY = "daftar.v1";

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
    contractTotal: number;
    supervisionPct: number;
  }) => string;
  addClient: (input: { name: string; phone?: string }) => string;
  addContractor: (input: { name: string; phone?: string }) => string;
  addSupplier: (input: { name: string; phone?: string }) => string;
  addTransaction: (
    input: Omit<Transaction, "id" | "createdAt"> & { id?: string },
  ) => string;
  addPhoto: (input: {
    projectId: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  updatePhotoShare: (photoId: string, sharedWithClient: boolean) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed?.projects?.length) return createSeedState();
    return { ...createSeedState(), ...parsed, unlocked: !!parsed.unlocked };
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
          status: "active",
          contractTotal: input.contractTotal,
          supervisionPct: input.supervisionPct,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          projects: [project, ...prev.projects],
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
      addPhoto: (input) => {
        const id = newId("ph");
        const photo: GalleryPhoto = {
          id,
          projectId: input.projectId,
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
