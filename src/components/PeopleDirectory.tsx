"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { expensesForPerson, projectTotals } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Person } from "@/lib/types";

type Kind = "clients" | "contractors" | "suppliers";

const copy: Record<
  Kind,
  { empty: string; add: string; total: string; hint: string }
> = {
  clients: {
    empty: "لسه مفيش عملاء. ضيف أول عميل.",
    add: "عميل جديد",
    total: "مستلم منه",
    hint: "اسم العميل",
  },
  contractors: {
    empty: "لسه مفيش مقاولين. ضيف المقاول عشان تربطه بالمصروف.",
    add: "مقاول جديد",
    total: "اتصرف له",
    hint: "اسم المقاول",
  },
  suppliers: {
    empty: "لسه مفيش موردين. ضيف المورد عشان تربطه بالمصروف.",
    add: "مورد جديد",
    total: "اتصرف له",
    hint: "اسم المورد",
  },
};

export function PeopleDirectory({ kind, title }: { kind: Kind; title: string }) {
  const { state, addClient, addContractor, addSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const text = copy[kind];

  const list =
    kind === "clients"
      ? state.clients
      : kind === "contractors"
        ? state.contractors
        : state.suppliers;

  const selected = list.find((person) => person.id === selectedId);

  function totalFor(person: Person) {
    if (kind === "clients") {
      return state.projects
        .filter((project) => project.clientId === person.id)
        .reduce((sum, project) => sum + projectTotals(state, project.id).received, 0);
    }
    const key = kind === "contractors" ? "contractorId" : "supplierId";
    return expensesForPerson(state, key, person.id).reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
  }

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

  if (open) {
    return (
      <AppShell title={text.add}>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            placeholder={text.hint}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="input"
            placeholder="الموبايل (اختياري)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ
          </button>
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => setOpen(false)}
          >
            رجوع
          </button>
        </form>
      </AppShell>
    );
  }

  if (selected) {
    return (
      <PersonDetail
        kind={kind}
        person={selected}
        totalLabel={text.total}
        total={totalFor(selected)}
        onBack={() => setSelectedId("")}
      />
    );
  }

  return (
    <AppShell
      title={title}
      action={
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => setOpen(true)}
        >
          إضافة
        </button>
      }
    >
      {list.length === 0 ? (
        <p className="card text-stone-600">{text.empty}</p>
      ) : (
        <div className="space-y-2">
          {list.map((person) => (
            <button
              key={person.id}
              type="button"
              className="card flex w-full items-center justify-between gap-3 text-right"
              onClick={() => setSelectedId(person.id)}
            >
              <div>
                <p className="font-bold">{person.name}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {text.total}: {formatMoney(totalFor(person))}
                </p>
              </div>
              <span className="text-stone-400">‹</span>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function PersonDetail({
  kind,
  person,
  totalLabel,
  total,
  onBack,
}: {
  kind: Kind;
  person: Person;
  totalLabel: string;
  total: number;
  onBack: () => void;
}) {
  const { state } = useStore();
  const projects = useMemo(
    () => state.projects.filter((project) => project.clientId === person.id),
    [state.projects, person.id],
  );
  const movements = useMemo(() => {
    if (kind === "clients") return [];
    const key = kind === "contractors" ? "contractorId" : "supplierId";
    return expensesForPerson(state, key, person.id);
  }, [kind, person.id, state]);

  return (
    <AppShell title={person.name}>
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={onBack}>
        رجوع
      </button>
      {person.phone ? (
        <a className="card mb-3 block" href={`tel:${person.phone}`} dir="ltr">
          {person.phone}
        </a>
      ) : null}
      <div className="card mb-3">
        <p className="text-sm text-stone-500">{totalLabel}</p>
        <p className="text-2xl font-black">{formatMoney(total)}</p>
      </div>

      {kind === "clients" ? (
        <div className="space-y-2">
          {projects.length === 0 ? (
            <p className="card text-stone-500">لسه مفيش مشروع للعميل ده.</p>
          ) : (
            projects.map((project) => {
              const totals = projectTotals(state, project.id);
              return (
                <Link
                  key={project.id}
                  href={`/project/?id=${encodeURIComponent(project.id)}`}
                  className="card block"
                >
                  <p className="font-bold">{project.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    مستلم {formatMoney(totals.received)} · مصروف{" "}
                    {formatMoney(totals.spent)} · متبقي {formatMoney(totals.remaining)}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      ) : movements.length === 0 ? (
        <p className="card text-stone-500">
          لسه مفيش مصروف متربط بالاسم ده. اربطه لما تسجل حركة فلوس.
        </p>
      ) : (
        <ul className="card divide-y divide-stone-100">
          {movements.map((tx) => {
            const project = state.projects.find((item) => item.id === tx.projectId);
            return (
              <li key={tx.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{tx.notes || "مصروف"}</p>
                  <p className="text-stone-500">
                    {project?.name || "مشروع"} · {formatDay(tx.date)}
                  </p>
                </div>
                <p className="font-bold text-sky-800">{formatMoney(tx.amount)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
