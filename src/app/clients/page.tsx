"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

function PeoplePage({
  title,
  kind,
}: {
  title: string;
  kind: "clients" | "contractors" | "suppliers";
}) {
  const { state, addClient, addContractor, addSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const list =
    kind === "clients"
      ? state.clients
      : kind === "contractors"
        ? state.contractors
        : state.suppliers;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (kind === "clients") addClient({ name, phone });
    if (kind === "contractors") addContractor({ name, phone });
    if (kind === "suppliers") addSupplier({ name, phone });
    setName("");
    setPhone("");
    setOpen(false);
  }

  return (
    <AppShell
      title={title}
      action={
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => setOpen((v) => !v)}
        >
          إضافة
        </button>
      }
    >
      {open ? (
        <form onSubmit={onSubmit} className="card mb-4 space-y-3">
          <input
            className="input"
            placeholder="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="الموبايل (اختياري)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ
          </button>
        </form>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-stone-500">الأخيرين</p>
        {list.map((person) => (
          <div key={person.id} className="card flex items-center justify-between">
            <div>
              <p className="font-bold">{person.name}</p>
              {person.phone ? (
                <p className="text-sm text-stone-500" dir="ltr">
                  {person.phone}
                </p>
              ) : null}
            </div>
            <span className="h-4 w-4 rounded-full border border-stone-300" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export default function ClientsPage() {
  return <PeoplePage title="العملاء" kind="clients" />;
}
