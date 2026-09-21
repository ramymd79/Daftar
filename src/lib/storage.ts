"use client";

import type { DaftarStore, Project } from "./types";
import { uid } from "./money";

const KEY = "daftar.v1";

function emptyStore(): DaftarStore {
  return { version: 1, projects: [] };
}

export function loadStore(): DaftarStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as DaftarStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.projects)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: DaftarStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function seedDemoProjects(): Project[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: uid("prj"),
      name: "شقة التجمع الخامس",
      clientName: "أحمد محمود",
      address: "التجمع الخامس — القاهرة",
      status: "active",
      profitMode: "percent",
      profitPercent: 15,
      fixedFee: 0,
      contractPrice: 0,
      createdAt: today,
      payments: [
        {
          id: uid("pay"),
          date: today,
          amount: 100000,
          note: "دفعة تحت الحساب",
        },
      ],
      expenses: [
        {
          id: uid("exp"),
          date: today,
          amount: 28000,
          category: "plumbing",
          note: "خامات سباكة",
        },
        {
          id: uid("exp"),
          date: today,
          amount: 22000,
          category: "electrical",
          note: "أسلاك ولوحات",
        },
        {
          id: uid("exp"),
          date: today,
          amount: 20000,
          category: "painting",
          note: "يوميات نقاشة",
        },
      ],
    },
  ];
}
