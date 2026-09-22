"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Ledger } from "@/components/Ledger";
import { useStore } from "@/lib/store";

function LedgerInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <AppShell title="الحركات">
        <p className="card text-stone-600">المشروع مش موجود.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="الحركات">
      <Link
        href={`/project/?id=${encodeURIComponent(project.id)}&tab=finance`}
        className="mb-3 inline-block text-sm text-stone-500"
      >
        رجوع للمالية
      </Link>
      <p className="mb-3 font-bold">{project.name}</p>
      <Ledger state={state} projectId={project.id} />
    </AppShell>
  );
}

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="الحركات">
          <p className="text-stone-500">جاري التحميل…</p>
        </AppShell>
      }
    >
      <LedgerInner />
    </Suspense>
  );
}
