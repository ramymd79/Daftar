"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export default function SuppliersPage() {
  const { state, addSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addSupplier({ name, phone });
    setName("");
    setPhone("");
    setOpen(false);
  }

  return (
    <AppShell
      title="الموردون"
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
        {state.suppliers.map((person) => (
          <div key={person.id} className="card">
            <p className="font-bold">{person.name}</p>
            {person.phone ? (
              <p className="text-sm text-stone-500" dir="ltr">
                {person.phone}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
