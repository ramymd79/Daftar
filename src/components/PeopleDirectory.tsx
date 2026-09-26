"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { expenseBreakdown, expensesForPerson, projectTotals, statusLabel } from "@/lib/logic";
import { formatDay, formatMoney, sumBy } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { AppState, Person, Project, Transaction } from "@/lib/types";

type Kind = "clients" | "contractors" | "suppliers";

const copy: Record<
  Kind,
  {
    empty: string;
    add: string;
    hint: string;
    search: string;
    detail: string;
    attachments: string;
    summaryHint: string;
  }
> = {
  clients: {
    empty: "لسه مفيش عملاء. ضيف أول عميل.",
    add: "عميل جديد",
    hint: "اسم العميل",
    search: "بحث بالاسم أو البريد أو الهاتف...",
    detail: "تفاصيل العميل",
    attachments: "مرفقات العميل",
    summaryHint: "إجمالي المدفوعات والمستحقات",
  },
  contractors: {
    empty: "لسه مفيش مقاولين. ضيف المقاول عشان تربطه بالمصروف.",
    add: "مقاول جديد",
    hint: "اسم المقاول",
    search: "بحث بالاسم أو الهاتف أو الملاحظات...",
    detail: "تفاصيل المقاول",
    attachments: "مرفقات المقاول",
    summaryHint: "مدفوعات المقاول وتاريخ المشاريع",
  },
  suppliers: {
    empty: "لسه مفيش موردين. ضيف المورد عشان تربطه بالمصروف.",
    add: "مورد جديد",
    hint: "اسم المورد",
    search: "بحث بالاسم أو الهاتف أو البريد...",
    detail: "تفاصيل المورد",
    attachments: "مرفقات المورد",
    summaryHint: "المشاريع وسجل المشتريات",
  },
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function tradeNames(state: AppState, txs: Transaction[]) {
  const names: string[] = [];
  for (const tx of txs) {
    const name = state.categories.find((item) => item.id === tx.categoryId)?.name;
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function personMatches(kind: Kind, person: Person, query: string) {
  const needle = query.trim();
  if (!needle) return true;
  const haystack = [person.name, person.phone || "", kind === "contractors" ? person.notes || "" : person.email || ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle.toLowerCase());
}

function NotReady({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className="shrink-0 rounded-xl border border-dashed border-stone-300 bg-stone-100 px-3 py-2 text-center text-xs font-bold text-stone-500"
    >
      <span className="block">{label}</span>
      <span className="mt-0.5 block font-normal">لسه مش شغالة</span>
    </button>
  );
}

const SUPPLIER_CHIPS = ["حديد", "أسمنت", "رمل", "سباكة", "أدوات صحية", "كهرباء", "إنارة", "دهانات", "أخشاب", "موبيليا", "رخام"];
type SupplierSort = "newest" | "oldest" | "name_az" | "name_za" | "spend_high" | "spend_low";
type ContractorSort =
  | "active_first"
  | "inactive_first"
  | "newest"
  | "oldest"
  | "name_az"
  | "name_za"
  | "paid_high"
  | "paid_low";
type ProjectPresence = "active_projects" | "no_active" | "balance";

function personTrades(state: AppState, kind: Kind, person: Person) {
  const fromTx =
    kind === "clients"
      ? []
      : tradeNames(state, expensesForPerson(state, kind === "contractors" ? "contractorId" : "supplierId", person.id));
  const names = [...(person.specialties || [])];
  for (const name of fromTx) {
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function contractorPaid(state: AppState, id: string) {
  return sumBy(expensesForPerson(state, "contractorId", id), (tx) => tx.amount);
}

function clientLinkInfo(state: AppState, clientId: string) {
  const projects = state.projects.filter((project) => project.clientId === clientId);
  const projectIds = new Set(projects.map((project) => project.id));
  const payments = state.transactions.filter(
    (tx) => tx.type === "client_payment" && projectIds.has(tx.projectId),
  );
  const unpaid = sumBy(projects, (project) => {
    const received = sumBy(
      payments.filter((tx) => tx.projectId === project.id),
      (tx) => tx.amount,
    );
    return Math.max(0, (project.contractTotal || 0) - received);
  });
  return {
    projects,
    activeProjects: projects.filter((project) => project.status === "active"),
    payments,
    unpaid,
    blocked: projects.length > 0 || payments.length > 0,
  };
}

function supplierPurchases(state: AppState, supplierId: string) {
  return expensesForPerson(state, "supplierId", supplierId);
}

async function pickContact(onPick: (name?: string, phone?: string) => void) {
  const nav = navigator as Navigator & {
    contacts?: {
      select: (
        props: string[],
        opts: { multiple: boolean },
      ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
    };
  };
  if (!nav.contacts?.select) return;
  try {
    const picked = await nav.contacts.select(["name", "tel"], { multiple: false });
    const first = picked[0];
    if (!first) return;
    onPick(first.name?.[0], first.tel?.[0]);
  } catch {
    return;
  }
}

function contractorProjectRows(state: AppState, id: string) {
  const payments = expensesForPerson(state, "contractorId", id);
  const agreements = state.agreements.filter((item) => item.contractorId === id);
  const projectIds = [...new Set([...agreements.map((item) => item.projectId), ...payments.map((item) => item.projectId)])];
  return projectIds
    .map((projectId) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return null;
      const agreed = sumBy(
        agreements.filter((item) => item.projectId === projectId),
        (item) => item.amount,
      );
      const paid = sumBy(
        payments.filter((item) => item.projectId === projectId),
        (item) => item.amount,
      );
      return {
        project,
        paidCount: payments.filter((item) => item.projectId === projectId).length,
        remaining: agreed - paid,
      };
    })
    .filter((row): row is { project: Project; paidCount: number; remaining: number } => Boolean(row));
}

function localPhone(phone?: string) {
  const digits = digitsOnly(phone || "");
  if (digits.startsWith("20")) return digits.slice(2);
  return digits;
}

function displayPhone(phone?: string) {
  const local = localPhone(phone);
  return local ? `(+20) ${local}` : "";
}

export function PeopleDirectory({ kind, title, initialId = "" }: { kind: Kind; title: string; initialId?: string }) {
  const { state, addClient, addContractor, addSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initialId);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SupplierSort>("newest");
  const [chips, setChips] = useState<string[]>([]);
  const [draftSort, setDraftSort] = useState<SupplierSort>("newest");
  const [draftChips, setDraftChips] = useState<string[]>([]);
  const [cSort, setCSort] = useState<ContractorSort>("active_first");
  const [cTrades, setCTrades] = useState<string[]>([]);
  const [cPresence, setCPresence] = useState<ProjectPresence[]>([]);
  const [draftCSort, setDraftCSort] = useState<ContractorSort>("active_first");
  const [draftCTrades, setDraftCTrades] = useState<string[]>([]);
  const [draftCPresence, setDraftCPresence] = useState<ProjectPresence[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const text = copy[kind];

  const list =
    kind === "clients" ? state.clients : kind === "contractors" ? state.contractors : state.suppliers;
  const selected = list.find((person) => person.id === selectedId);
  const matched = list.filter((person) => personMatches(kind, person, query));
  const visible =
    kind === "suppliers"
      ? sortedPeople(kind, state, matched, sortKey, chips)
      : kind === "contractors"
        ? sortedContractors(state, matched, cSort, cTrades, cPresence)
        : matched;
  const contractorTradeOptions = useMemo(() => {
    if (kind !== "contractors") return [];
    const names: string[] = [];
    for (const person of list) {
      for (const name of personTrades(state, "contractors", person)) {
        if (!names.includes(name)) names.push(name);
      }
    }
    return names;
  }, [kind, list, state]);

  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
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
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <input
            className="input"
            placeholder={text.hint}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="الموبايل (اختياري)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setOpen(false)}>
            رجوع
          </button>
        </form>
      </AppShell>
    );
  }

  if (selected && summaryOpen) {
    return (
      <PersonSummary
        kind={kind}
        person={selected}
        onBack={() => setSummaryOpen(false)}
      />
    );
  }

  if (selected) {
    return (
      <PersonDetail
        kind={kind}
        person={selected}
        onBack={() => {
          setSummaryOpen(false);
          setSelectedId("");
        }}
        onSummary={() => setSummaryOpen(true)}
      />
    );
  }

  return (
    <AppShell title={title} showFab onFabClick={() => setOpen(true)}>
      <div className="mb-3 flex items-center gap-2">
        <input
          className="input min-w-0 flex-1"
          placeholder={text.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={text.search}
        />
        {kind === "clients" ? (
          <NotReady label="تصفية" />
        ) : (
          <button
            type="button"
            className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold"
            onClick={() => {
              if (kind === "suppliers") {
                setDraftSort(sortKey);
                setDraftChips(chips);
              } else {
                setDraftCSort(cSort);
                setDraftCTrades(cTrades);
                setDraftCPresence(cPresence);
              }
              setFilterOpen(true);
            }}
          >
            تصفية
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="card text-stone-600">{text.empty}</p>
      ) : visible.length === 0 ? (
        <p className="card text-stone-600">مفيش نتيجة للبحث.</p>
      ) : kind === "clients" ? (
        <ClientList people={visible} onOpen={setSelectedId} />
      ) : (
        <div className="space-y-2">
          {visible.map((person) => (
            <PersonCard key={person.id} kind={kind} person={person} onOpen={() => setSelectedId(person.id)} />
          ))}
          <p className="pt-2 text-center text-xs text-stone-400">نهاية القائمة</p>
          {kind === "contractors" ? <p className="text-center text-xs text-stone-400">اطلعت على الكل</p> : null}
        </div>
      )}
      {filterOpen && kind === "contractors" ? (
        <ContractorFilter
          sortKey={draftCSort}
          trades={draftCTrades}
          tradeOptions={contractorTradeOptions}
          presence={draftCPresence}
          onSort={setDraftCSort}
          onToggleTrade={(name) =>
            setDraftCTrades((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
          }
          onTogglePresence={(flag) =>
            setDraftCPresence((prev) => (prev.includes(flag) ? prev.filter((item) => item !== flag) : [...prev, flag]))
          }
          onClear={() => {
            setDraftCSort("active_first");
            setDraftCTrades([]);
            setDraftCPresence([]);
          }}
          onClose={() => setFilterOpen(false)}
          onApply={() => {
            setCSort(draftCSort);
            setCTrades(draftCTrades);
            setCPresence(draftCPresence);
            setFilterOpen(false);
          }}
        />
      ) : null}
      {filterOpen && kind === "suppliers" ? (
        <SupplierFilter
          sortKey={draftSort}
          chips={draftChips}
          onSort={setDraftSort}
          onToggle={(name) => setDraftChips((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))}
          onClear={() => {
            setDraftSort("newest");
            setDraftChips([]);
          }}
          onClose={() => setFilterOpen(false)}
          onApply={() => {
            setSortKey(draftSort);
            setChips(draftChips);
            setFilterOpen(false);
          }}
        />
      ) : null}
    </AppShell>
  );
}

function supplierSpent(state: AppState, id: string) {
  return expensesForPerson(state, "supplierId", id).reduce((sum, tx) => sum + expenseBreakdown(tx).total, 0);
}

function sortedPeople(kind: Kind, state: AppState, people: Person[], sortKey: SupplierSort, chips: string[]) {
  if (kind !== "suppliers") return people;
  const filtered = chips.length
    ? people.filter((person) => {
        const trades = tradeNames(state, expensesForPerson(state, "supplierId", person.id));
        return chips.some((chip) => trades.includes(chip));
      })
    : people;
  const copy = [...filtered];
  if (sortKey === "oldest") return copy.reverse();
  if (sortKey === "name_az") return copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (sortKey === "name_za") return copy.sort((a, b) => b.name.localeCompare(a.name, "ar"));
  if (sortKey === "spend_high") return copy.sort((a, b) => supplierSpent(state, b.id) - supplierSpent(state, a.id));
  if (sortKey === "spend_low") return copy.sort((a, b) => supplierSpent(state, a.id) - supplierSpent(state, b.id));
  return copy;
}

function SupplierFilter({
  sortKey,
  chips,
  onSort,
  onToggle,
  onClear,
  onClose,
  onApply,
}: {
  sortKey: SupplierSort;
  chips: string[];
  onSort: (value: SupplierSort) => void;
  onToggle: (name: string) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const sorts: { id: SupplierSort; label: string }[] = [
    { id: "newest", label: "الإضافة الأحدث" },
    { id: "oldest", label: "الإضافة الأقدم" },
    { id: "name_az", label: "الاسم أ-ي" },
    { id: "name_za", label: "الاسم ي-أ" },
    { id: "spend_high", label: "الإنفاق الأعلى" },
    { id: "spend_low", label: "الإنفاق الأقل" },
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={onClear}>مسح الكل</button>
          <p className="font-black">تصفية وترتيب</p>
          <span className="w-14" />
        </div>
        <div className="space-y-2">
          {sorts.map((option) => (
            <label key={option.id} className="card flex items-center justify-between">
              <span>{option.label}</span>
              <input type="radio" name="supplier-sort" checked={sortKey === option.id} onChange={() => onSort(option.id)} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SUPPLIER_CHIPS.map((name) => (
            <button
              key={name}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm font-bold ${chips.includes(name) ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"}`}
              onClick={() => onToggle(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={onApply}>تطبيق الفلاتر</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function sortedContractors(
  state: AppState,
  people: Person[],
  sortKey: ContractorSort,
  trades: string[],
  presence: ProjectPresence[],
) {
  let filtered = people;
  if (trades.length) {
    filtered = filtered.filter((person) => {
      const names = personTrades(state, "contractors", person);
      return trades.some((chip) => names.includes(chip));
    });
  }
  if (presence.length) {
    filtered = filtered.filter((person) => {
      const rows = contractorProjectRows(state, person.id);
      const active = rows.some((row) => row.project.status === "active");
      const balance = rows.some((row) => row.remaining > 0);
      return presence.every((flag) => {
        if (flag === "active_projects") return active;
        if (flag === "no_active") return !active;
        return balance;
      });
    });
  }
  const copy = [...filtered];
  if (sortKey === "oldest") return copy.reverse();
  if (sortKey === "name_az") return copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (sortKey === "name_za") return copy.sort((a, b) => b.name.localeCompare(a.name, "ar"));
  if (sortKey === "paid_high") return copy.sort((a, b) => contractorPaid(state, b.id) - contractorPaid(state, a.id));
  if (sortKey === "paid_low") return copy.sort((a, b) => contractorPaid(state, a.id) - contractorPaid(state, b.id));
  if (sortKey === "inactive_first") return copy.sort((a, b) => Number(a.active !== false) - Number(b.active !== false));
  if (sortKey === "active_first") return copy.sort((a, b) => Number(b.active !== false) - Number(a.active !== false));
  return copy;
}

function ChoiceChip({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-sm font-bold ${selected ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"}`}
      onClick={onClick}
    >
      {selected ? "✓ " : ""}
      {label}
    </button>
  );
}

function ContractorFilter({
  sortKey,
  trades,
  tradeOptions,
  presence,
  onSort,
  onToggleTrade,
  onTogglePresence,
  onClear,
  onClose,
  onApply,
}: {
  sortKey: ContractorSort;
  trades: string[];
  tradeOptions: string[];
  presence: ProjectPresence[];
  onSort: (value: ContractorSort) => void;
  onToggleTrade: (name: string) => void;
  onTogglePresence: (flag: ProjectPresence) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const sorts: { id: ContractorSort; label: string }[] = [
    { id: "active_first", label: "الحالة (النشط أولاً)" },
    { id: "inactive_first", label: "الحالة (غير النشط أولاً)" },
    { id: "newest", label: "الإضافة: الأحدث" },
    { id: "oldest", label: "الإضافة: الأقدم" },
    { id: "name_az", label: "الاسم: أ-ي" },
    { id: "name_za", label: "الاسم: ي-أ" },
    { id: "paid_high", label: "المدفوع: الأعلى" },
    { id: "paid_low", label: "المدفوع: الأقل" },
  ];
  const presenceOptions: { id: ProjectPresence; label: string }[] = [
    { id: "active_projects", label: "له مشاريع نشطة" },
    { id: "no_active", label: "بدون مشاريع نشطة" },
    { id: "balance", label: "له رصيد متبقي" },
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={onClear}>
            مسح الكل
          </button>
          <p className="font-black">تصفية وترتيب</p>
          <button type="button" className="text-lg font-bold text-stone-500" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {sorts.map((option) => (
            <ChoiceChip key={option.id} selected={sortKey === option.id} label={option.label} onClick={() => onSort(option.id)} />
          ))}
        </div>
        {tradeOptions.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-stone-500">البنود</p>
            <div className="flex flex-wrap gap-2">
              {tradeOptions.map((name) => (
                <ChoiceChip key={name} selected={trades.includes(name)} label={name} onClick={() => onToggleTrade(name)} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-stone-500">حالة المشاريع</p>
          <div className="flex flex-wrap gap-2">
            {presenceOptions.map((option) => (
              <ChoiceChip
                key={option.id}
                selected={presence.includes(option.id)}
                label={option.label}
                onClick={() => onTogglePresence(option.id)}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={onApply}>
            تطبيق الفلاتر
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientList({ people, onOpen }: { people: Person[]; onOpen: (id: string) => void }) {
  const { state } = useStore();
  const grouped = useMemo(() => {
    const active: Person[] = [];
    const idle: Person[] = [];
    for (const person of people) {
      const projects = state.projects.filter((project) => project.clientId === person.id);
      if (projects.some((project) => project.status === "active")) active.push(person);
      else idle.push(person);
    }
    return { active, idle };
  }, [people, state.projects]);

  return (
    <div className="space-y-4">
      <ClientGroup title="لديهم مشاريع نشطة" people={grouped.active} onOpen={onOpen} />
      <ClientGroup title="بدون مشاريع نشطة" people={grouped.idle} onOpen={onOpen} />
      <p className="text-center text-xs text-stone-400">نهاية القائمة</p>
    </div>
  );
}

function ClientGroup({
  title,
  people,
  onOpen,
}: {
  title: string;
  people: Person[];
  onOpen: (id: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-stone-500">{title}</h2>
      {people.map((person) => (
        <ClientCard key={person.id} person={person} onOpen={() => onOpen(person.id)} />
      ))}
    </section>
  );
}

function ClientCard({ person, onOpen }: { person: Person; onOpen: () => void }) {
  const { state } = useStore();
  const projects = state.projects.filter((project) => project.clientId === person.id);
  const activeCount = projects.filter((project) => project.status === "active").length;
  const over = projects.some((project) => {
    const totals = projectTotals(state, project.id);
    return totals.spent > totals.received;
  });

  return (
    <button type="button" className="card w-full space-y-2 text-right" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{person.name}</p>
          <p className="mt-1 text-sm text-stone-500">
            {projects.length.toLocaleString("ar-EG")} مشروع
            {activeCount > 0 ? " · نشط" : ""}
          </p>
        </div>
        <span className="text-stone-400">‹</span>
      </div>
      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
        الحالة لسه مش شغالة
      </span>
      {over ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">
          يوجد مشروع مصروفاته تتجاوز المستلم
        </p>
      ) : null}
    </button>
  );
}

function PersonCard({
  kind,
  person,
  onOpen,
}: {
  kind: Kind;
  person: Person;
  onOpen: () => void;
}) {
  const { state } = useStore();
  const trades = personTrades(state, kind, person);
  const spent =
    kind === "suppliers"
      ? expensesForPerson(state, "supplierId", person.id).reduce(
          (sum, tx) => sum + expenseBreakdown(tx).total,
          0,
        )
      : 0;

  return (
    <button type="button" className="card w-full space-y-2 text-right" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold">{person.name}</p>
        <span className="text-stone-400">‹</span>
      </div>
      {trades.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {trades.map((trade) => (
            <span key={trade} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
              {trade}
            </span>
          ))}
        </div>
      ) : null}
      {kind === "contractors" ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${person.active === false ? "bg-stone-100 text-stone-500" : "bg-emerald-100 text-emerald-800"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${person.active === false ? "bg-stone-400" : "bg-emerald-600"}`} />
          {person.active === false ? "غير نشط" : "نشط"}
        </span>
      ) : (
        <p className="text-sm text-stone-500">
          إجمالي الإنفاق <span className="font-bold text-rose-800">{formatMoney(spent)}</span>
        </p>
      )}
    </button>
  );
}

function PersonDetail({
  kind,
  person,
  onBack,
  onSummary,
}: {
  kind: Kind;
  person: Person;
  onBack: () => void;
  onSummary: () => void;
}) {
  const { state, deletePerson } = useStore();
  const [editing, setEditing] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const text = copy[kind];
  const showEmail = kind !== "contractors";
  const trades = kind === "clients" ? [] : personTrades(state, kind, person);
  const contractorLinked = kind === "contractors" ? contractorProjectRows(state, person.id) : [];
  const clientLinks = kind === "clients" ? clientLinkInfo(state, person.id) : null;
  const supplierBuys = kind === "suppliers" ? supplierPurchases(state, person.id) : [];
  const clientActive = Boolean(clientLinks?.activeProjects.length);
  const over =
    kind === "clients" &&
    Boolean(
      clientLinks?.projects.some((project) => {
        const totals = projectTotals(state, project.id);
        return totals.spent > totals.received;
      }),
    );
  const wa = digitsOnly(person.phone || "");

  function onTrash() {
    if (kind === "contractors") {
      if (contractorLinked.length) setBlockOpen(true);
      else setDeleteOpen(true);
      return;
    }
    if (kind === "clients") {
      if (clientLinks?.blocked) setBlockOpen(true);
      else setDeleteOpen(true);
      return;
    }
    if (supplierBuys.length) setBlockOpen(true);
    else setDeleteOpen(true);
  }

  if (editing) {
    if (kind === "contractors") return <ContractorEdit person={person} onClose={() => setEditing(false)} />;
    if (kind === "clients") return <ClientEdit person={person} onClose={() => setEditing(false)} />;
    return <SupplierEdit person={person} onClose={() => setEditing(false)} />;
  }

  return (
    <AppShell
      title={text.detail}
      action={
        <div className="flex items-center gap-1">
          <button type="button" aria-label="تعديل" className="rounded-xl p-2 text-stone-700" onClick={() => setEditing(true)}>
            <PencilIcon />
          </button>
          <button type="button" aria-label="حذف" className="rounded-xl p-2 text-rose-700" onClick={onTrash}>
            <TrashIcon />
          </button>
        </div>
      }
    >
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={onBack}>
        رجوع
      </button>
      <p className="mb-3 text-sm text-stone-500">{person.name}</p>
      <div className="card mb-3 text-center">
        <p className="text-xl font-black">{person.name}</p>
        {kind === "clients" ? (
          <div className="mt-2 flex justify-center">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${clientActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${clientActive ? "bg-emerald-600" : "bg-stone-400"}`} />
              {clientActive ? "نشط" : "غير نشط"}
            </span>
          </div>
        ) : null}
        {trades.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {trades.map((trade) => (
              <span key={trade} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {trade}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {over ? (
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">
          يوجد مشروع مصروفاته تتجاوز المستلم
        </p>
      ) : null}
      <button type="button" className="card mb-3 flex w-full items-center justify-between gap-3 text-right" onClick={onSummary}>
        <span>
          <span className="block font-bold">الملخص المالي</span>
          <span className="mt-1 block text-sm text-stone-500">{text.summaryHint}</span>
        </span>
        <span className="text-stone-400">‹</span>
      </button>
      <div className="card mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">الهاتف الأساسي</p>
          <p className="font-bold" dir="ltr">
            {displayPhone(person.phone) || "لا يوجد هاتف"}
          </p>
          {person.extraPhone ? (
            <p className="mt-1 text-sm text-stone-500" dir="ltr">
              {displayPhone(person.extraPhone)}
            </p>
          ) : null}
        </div>
        {person.phone ? (
          <div className="flex gap-2">
            <a className="btn btn-secondary px-3 py-2 text-sm" href={`tel:${person.phone}`}>
              اتصال
            </a>
            {wa ? (
              <a
                className="btn btn-secondary px-3 py-2 text-sm"
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
              >
                واتساب
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {showEmail ? (
        <div className="card mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">البريد الإلكتروني</p>
            <p className="font-bold" dir="ltr">
              {person.email || "لا يوجد بريد"}
            </p>
          </div>
          {person.email ? (
            <a className="btn btn-secondary px-3 py-2 text-sm" href={`mailto:${person.email}`}>
              إرسال
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="card mb-3">
        <p className="font-bold">ملاحظات</p>
        <p className="mt-1 text-sm text-stone-500">{person.notes || "لا يوجد ملاحظات"}</p>
      </div>
      <div className="card space-y-3">
        <p className="font-bold">{text.attachments}</p>
        {person.attachmentDataUrl ? (
          person.attachmentDataUrl.startsWith("data:image") ? (
            <img src={person.attachmentDataUrl} alt="" className="max-h-40 rounded-xl" />
          ) : (
            <p className="text-sm text-stone-600">مرفق</p>
          )
        ) : (
          <p className="text-sm text-stone-500">لا يوجد مرفقات</p>
        )}
      </div>
      {blockOpen && kind === "contractors" ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4">
            <p className="text-lg font-black">لا يمكن حذف المقاول</p>
            <p className="text-sm leading-7 text-stone-600">
              لا يمكن حذف مقاول مرتبط بأي مشروع. يبقى المقاول ظاهرًا ويمكن مراجعة المشاريع المرتبطة.
            </p>
            {contractorLinked.map((row) => (
              <div key={row.project.id} className="rounded-2xl border border-stone-200 p-3 text-sm">
                <p className="font-bold">
                  {row.project.name} – {row.project.status === "active" ? "مشروع نشط" : statusLabel(row.project.status)}
                </p>
                <p className="mt-1 text-stone-600">
                  {row.paidCount.toLocaleString("ar-EG")} سجلات مدفوعات مقاول مرتبطة بسجل المشروع
                </p>
              </div>
            ))}
            <button type="button" className="btn btn-primary w-full" onClick={() => setBlockOpen(false)}>
              فهمت
            </button>
          </div>
        </div>
      ) : null}
      {blockOpen && kind === "clients" && clientLinks ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 text-center">
            <p className="text-lg font-black">لا يمكن حذف العميل</p>
            <p className="text-sm leading-7 text-stone-600">
              لا يمكن حذف هذا العميل لوجود بيانات مرتبطة. قم بحل هذه الارتباطات أولاً:
            </p>
            <div className="space-y-2 rounded-2xl bg-[#f3e6dc] px-3 py-3 text-right text-sm">
              {clientLinks.activeProjects.map((project) => (
                <p key={project.id} className="font-bold">
                  مشروع نشط: {project.name}
                </p>
              ))}
              {clientLinks.unpaid > 0 ? (
                <p className="font-bold">مستحقات غير مسددة: {formatMoney(clientLinks.unpaid)}</p>
              ) : null}
              {clientLinks.payments.length > 0 ? <p className="font-bold">مدفوعات مسجّلة باسم العميل</p> : null}
            </div>
            <button type="button" className="btn btn-primary w-full" onClick={() => setBlockOpen(false)}>
              فهمت
            </button>
          </div>
        </div>
      ) : null}
      {blockOpen && kind === "suppliers" ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 text-center">
            <p className="text-lg font-black">لا يمكن حذف المورد</p>
            <p className="text-sm leading-7 text-stone-600">لا يمكن حذف هذا المورد لوجود مشتريات مرتبطة به.</p>
            <button type="button" className="btn btn-primary w-full" onClick={() => setBlockOpen(false)}>
              فهمت
            </button>
          </div>
        </div>
      ) : null}
      {deleteOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-700">
              <TrashIcon />
            </div>
            <p className="text-lg font-black">
              {kind === "contractors" ? "حذف المقاول؟" : kind === "clients" ? "حذف العميل؟" : "حذف المورد؟"}
            </p>
            <p className="text-sm leading-7 text-stone-600">
              {kind === "contractors"
                ? `سيتم حذف '${person.name}' من دليل الشركة. لا توجد مشاريع مرتبطة بهذا المقاول حاليًا.`
                : kind === "clients"
                  ? `سيتم حذف '${person.name}' من دليل الشركة. لا توجد بيانات مرتبطة بهذا العميل حاليًا.`
                  : `سيتم حذف '${person.name}' من دليل الشركة. لا توجد مشتريات مرتبطة بهذا المورد حاليًا.`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn bg-rose-700 text-white"
                onClick={() => {
                  deletePerson(kind, person.id);
                  setDeleteOpen(false);
                  onBack();
                }}
              >
                حذف
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function ContractorEdit({ person, onClose }: { person: Person; onClose: () => void }) {
  const { state, updatePerson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialTrades = person.specialties?.length ? person.specialties : personTrades(state, "contractors", person);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(localPhone(person.phone));
  const [extraOpen, setExtraOpen] = useState(Boolean(person.extraPhone));
  const [extraPhone, setExtraPhone] = useState(localPhone(person.extraPhone));
  const [specialties, setSpecialties] = useState<string[]>(initialTrades);
  const [notes, setNotes] = useState(person.notes || "");
  const [attachment, setAttachment] = useState(person.attachmentDataUrl || "");
  const [notice, setNotice] = useState("");
  const available = state.categories.map((item) => item.name).filter((item) => !specialties.includes(item));

  async function fromContacts() {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    };
    if (!nav.contacts?.select) return;
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: false });
      const first = picked[0];
      if (!first) return;
      if (first.name?.[0]) setName(first.name[0]);
      if (first.tel?.[0]) setPhone(localPhone(first.tel[0]));
    } catch {
      return;
    }
  }

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب اسم المقاول");
      return;
    }
    if (!digitsOnly(phone)) {
      setNotice("اكتب الهاتف");
      return;
    }
    if (!specialties.length) {
      setNotice("اختار بند");
      return;
    }
    updatePerson("contractors", person.id, {
      name,
      phone: `+20 ${digitsOnly(phone)}`,
      extraPhone: extraOpen && digitsOnly(extraPhone) ? `+20 ${digitsOnly(extraPhone)}` : "",
      notes,
      specialties,
      attachmentDataUrl: attachment,
    });
    onClose();
  }

  return (
    <AppShell title="تعديل المقاول">
      <form onSubmit={save} className="space-y-3" noValidate>
        {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
        <button type="button" className="btn btn-secondary w-full" onClick={() => void fromContacts()}>
          تحديث من جهة اتصال
        </button>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>اسم المقاول</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>الهاتف الأساسي</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(digitsOnly(event.target.value))}
            />
          </div>
        </div>
        {extraOpen ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              aria-label="رقم هاتف آخر"
              value={extraPhone}
              onChange={(event) => setExtraPhone(digitsOnly(event.target.value))}
            />
          </div>
        ) : (
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setExtraOpen(true)}>
            إضافة رقم هاتف آخر
          </button>
        )}
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>البنود</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          {available.length > 0 ? (
            <select
              className="input"
              value=""
              aria-label="البنود"
              onChange={(event) => {
                const value = event.target.value;
                if (!value || specialties.includes(value)) return;
                setSpecialties((prev) => [...prev, value]);
              }}
            >
              <option value="">اختار بند</option>
              {available.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}
          {specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {specialties.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold"
                  onClick={() => setSpecialties((prev) => prev.filter((name) => name !== item))}
                >
                  {item} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>ملاحظات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <textarea
            className="input min-h-24"
            placeholder="ملاحظات تشغيلية تظهر في ملف المقاول..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>مرفقات المقاول</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <button type="button" className="card w-full text-sm text-stone-500" onClick={() => fileRef.current?.click()}>
            اضغط لالتقاط أو رفع ملف
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          حفظ التعديلات
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
          إلغاء
        </button>
      </form>
    </AppShell>
  );
}

function ClientEdit({ person, onClose }: { person: Person; onClose: () => void }) {
  const { updatePerson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(localPhone(person.phone));
  const [extraOpen, setExtraOpen] = useState(Boolean(person.extraPhone));
  const [extraPhone, setExtraPhone] = useState(localPhone(person.extraPhone));
  const [email, setEmail] = useState(person.email || "");
  const [notes, setNotes] = useState(person.notes || "");
  const [attachment, setAttachment] = useState(person.attachmentDataUrl || "");
  const [notice, setNotice] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب الاسم الكامل");
      return;
    }
    if (!digitsOnly(phone)) {
      setNotice("اكتب رقم الهاتف");
      return;
    }
    updatePerson("clients", person.id, {
      name,
      phone: `+20 ${digitsOnly(phone)}`,
      extraPhone: extraOpen && digitsOnly(extraPhone) ? `+20 ${digitsOnly(extraPhone)}` : "",
      email,
      notes,
      attachmentDataUrl: attachment,
    });
    onClose();
  }

  return (
    <AppShell title="تعديل العميل">
      <p className="mb-3 text-sm text-stone-500">{person.name}</p>
      <form onSubmit={save} className="space-y-3" noValidate>
        {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-sm font-bold text-[var(--brand)]"
          onClick={() => void pickContact((pickedName, pickedPhone) => {
            if (pickedName) setName(pickedName);
            if (pickedPhone) setPhone(localPhone(pickedPhone));
          })}
        >
          استيراد من جهات الاتصال
        </button>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>الاسم الكامل</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>رقم الهاتف</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(digitsOnly(event.target.value))}
            />
          </div>
        </div>
        {extraOpen ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              aria-label="رقم هاتف آخر"
              value={extraPhone}
              onChange={(event) => setExtraPhone(digitsOnly(event.target.value))}
            />
          </div>
        ) : (
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setExtraOpen(true)}>
            + إضافة رقم هاتف آخر
          </button>
        )}
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>البريد الإلكتروني (لازم لدعوته لبوابة العميل)</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <input
            className="input"
            dir="ltr"
            inputMode="email"
            placeholder="client@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>ملاحظات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <textarea
            className="input min-h-24"
            placeholder="أي تفاصيل إضافية عن العميل..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>مرفقات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <button type="button" className="card w-full text-sm text-stone-500" onClick={() => fileRef.current?.click()}>
            اضغط لالتقاط أو رفع ملف
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setAttachment(String(reader.result || ""));
              reader.readAsDataURL(file);
            }}
          />
          {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          حفظ التعديلات
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
          إلغاء
        </button>
      </form>
    </AppShell>
  );
}

function SupplierEdit({ person, onClose }: { person: Person; onClose: () => void }) {
  const { state, updatePerson } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialTrades = person.specialties?.length ? person.specialties : personTrades(state, "suppliers", person);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(localPhone(person.phone));
  const [extraOpen, setExtraOpen] = useState(Boolean(person.extraPhone));
  const [extraPhone, setExtraPhone] = useState(localPhone(person.extraPhone));
  const [email, setEmail] = useState(person.email || "");
  const [specialties, setSpecialties] = useState<string[]>(initialTrades);
  const [notes, setNotes] = useState(person.notes || "");
  const [attachment, setAttachment] = useState(person.attachmentDataUrl || "");
  const [notice, setNotice] = useState("");
  const available = state.categories.map((item) => item.name).filter((item) => !specialties.includes(item));

  function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب اسم المورد");
      return;
    }
    if (!digitsOnly(phone)) {
      setNotice("اكتب الهاتف");
      return;
    }
    updatePerson("suppliers", person.id, {
      name,
      phone: `+20 ${digitsOnly(phone)}`,
      extraPhone: extraOpen && digitsOnly(extraPhone) ? `+20 ${digitsOnly(extraPhone)}` : "",
      email,
      notes,
      specialties,
      attachmentDataUrl: attachment,
    });
    onClose();
  }

  return (
    <AppShell title="تعديل المورد">
      <p className="mb-3 text-sm text-stone-500">{person.name}</p>
      <form onSubmit={save} className="space-y-3" noValidate>
        {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-sm font-bold text-[var(--brand)]"
          onClick={() => void pickContact((pickedName, pickedPhone) => {
            if (pickedName) setName(pickedName);
            if (pickedPhone) setPhone(localPhone(pickedPhone));
          })}
        >
          استيراد من جهات الاتصال
        </button>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>اسم المورد</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>الهاتف الأساسي</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(digitsOnly(event.target.value))}
            />
          </div>
        </div>
        {extraOpen ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              aria-label="هاتف إضافي"
              value={extraPhone}
              onChange={(event) => setExtraPhone(digitsOnly(event.target.value))}
            />
          </div>
        ) : (
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setExtraOpen(true)}>
            إضافة هاتف +
          </button>
        )}
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>البريد الإلكتروني</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <input
            className="input"
            dir="ltr"
            inputMode="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>البنود التي يوردها</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          {available.length > 0 ? (
            <select
              className="input"
              value=""
              aria-label="البنود التي يوردها"
              onChange={(event) => {
                const value = event.target.value;
                if (!value || specialties.includes(value)) return;
                setSpecialties((prev) => [...prev, value]);
              }}
            >
              <option value="">اختر البنود...</option>
              {available.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}
          {specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {specialties.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold"
                  onClick={() => setSpecialties((prev) => prev.filter((entry) => entry !== item))}
                >
                  {item} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>ملاحظات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <textarea
            className="input min-h-24"
            placeholder="أي تفاصيل إضافية عن المورد..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>مرفقات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <button type="button" className="card w-full text-sm text-stone-500" onClick={() => fileRef.current?.click()}>
            اضغط لالتقاط أو رفع ملف
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setAttachment(String(reader.result || ""));
              reader.readAsDataURL(file);
            }}
          />
          {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          حفظ التغييرات
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
          إلغاء
        </button>
      </form>
    </AppShell>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 12h6l1-12" />
    </svg>
  );
}

function PersonSummary({
  kind,
  person,
  onBack,
}: {
  kind: Kind;
  person: Person;
  onBack: () => void;
}) {
  const { state } = useStore();
  return (
    <AppShell title="الملخص المالي">
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={onBack}>
        رجوع
      </button>
      <p className="mb-3 text-sm text-stone-500">{person.name}</p>
      {kind === "contractors" ? <ContractorSummary person={person} /> : null}
      {kind === "suppliers" ? <SupplierSummary person={person} /> : null}
      {kind === "clients" ? <ClientSummary person={person} state={state} /> : null}
    </AppShell>
  );
}

function ProjectLink({ project }: { project: Project }) {
  return (
    <Link href={`/project/?id=${encodeURIComponent(project.id)}`} className="font-bold">
      {project.name}
    </Link>
  );
}

function StatusPill({ status }: { status: Project["status"] }) {
  const done = status === "done";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${done ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function ContractorSummary({ person }: { person: Person }) {
  const { state } = useStore();
  const payments = expensesForPerson(state, "contractorId", person.id);
  const agreements = state.agreements.filter((item) => item.contractorId === person.id);
  const projectIds = [...new Set([...agreements.map((item) => item.projectId), ...payments.map((item) => item.projectId)])];
  const rows = projectIds
    .map((projectId) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return null;
      const agreed = sumBy(
        agreements.filter((item) => item.projectId === projectId),
        (item) => item.amount,
      );
      const paid = sumBy(
        payments.filter((item) => item.projectId === projectId),
        (item) => item.amount,
      );
      return { project, agreed, paid };
    })
    .filter((row): row is { project: Project; agreed: number; paid: number } => Boolean(row));
  const agreedTotal = sumBy(rows, (row) => row.agreed);
  const paidTotal = sumBy(rows, (row) => row.paid);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-500">
        تاريخ المشاريع ({rows.length.toLocaleString("ar-EG")})
      </h2>
      {rows.length === 0 ? <p className="card text-stone-500">لسه مفيش اتفاق أو دفعة للمقاول ده.</p> : null}
      {rows.map((row) => (
        <article key={row.project.id} className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <ProjectLink project={row.project} />
            <StatusPill status={row.project.status} />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full bg-[var(--brand)]"
              style={{ width: `${row.agreed > 0 ? Math.min(100, (row.paid / row.agreed) * 100) : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p>
              <span className="block text-stone-500">المتفق عليه</span>
              <span className="font-black text-emerald-700">{formatMoney(row.agreed)}</span>
            </p>
            <p>
              <span className="block text-stone-500">المدفوع</span>
              <span className="font-black">{formatMoney(row.paid)}</span>
            </p>
          </div>
        </article>
      ))}
      {rows.length > 0 ? (
        <div className="card grid grid-cols-2 gap-3 text-sm">
          <p className="col-span-2 font-bold">الإجمالي على كل المشاريع</p>
          <p>
            <span className="block text-stone-500">المتفق عليه</span>
            <span className="font-black text-emerald-700">{formatMoney(agreedTotal)}</span>
          </p>
          <p>
            <span className="block text-stone-500">المدفوع</span>
            <span className="font-black">{formatMoney(paidTotal)}</span>
          </p>
        </div>
      ) : null}
      <MovementLog
        title={`سجل المدفوعات (${payments.length.toLocaleString("ar-EG")})`}
        rows={payments}
        amountOf={(tx) => tx.amount}
      />
    </div>
  );
}

function SupplierSummary({ person }: { person: Person }) {
  const { state } = useStore();
  const purchases = expensesForPerson(state, "supplierId", person.id);
  const projectIds = [...new Set(purchases.map((item) => item.projectId))];
  const rows = projectIds
    .map((projectId) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return null;
      const total = sumBy(
        purchases.filter((item) => item.projectId === projectId),
        (item) => expenseBreakdown(item).total,
      );
      return { project, total };
    })
    .filter((row): row is { project: Project; total: number } => Boolean(row));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-500">المشاريع ({rows.length.toLocaleString("ar-EG")})</h2>
      {rows.length === 0 ? <p className="card text-stone-500">لسه مفيش مشتريات من المورد ده.</p> : null}
      {rows.map((row) => (
        <article key={row.project.id} className="card space-y-2">
          <div className="flex items-start justify-between gap-3">
            <ProjectLink project={row.project} />
            <StatusPill status={row.project.status} />
          </div>
          <p className="text-sm text-stone-500">
            إجمالي المشتريات <span className="font-black text-rose-800">{formatMoney(row.total)}</span>
          </p>
        </article>
      ))}
      <MovementLog
        title={`سجل المشتريات (${purchases.length.toLocaleString("ar-EG")})`}
        rows={purchases}
        amountOf={(tx) => expenseBreakdown(tx).total}
      />
    </div>
  );
}

function ClientSummary({ person, state }: { person: Person; state: AppState }) {
  const projects = state.projects.filter((project) => project.clientId === person.id);
  const payments = state.transactions
    .filter((tx) => tx.type === "client_payment" && projects.some((project) => project.id === tx.projectId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const receivedTotal = sumBy(projects, (project) => projectTotals(state, project.id).received);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-stone-500">المشاريع ({projects.length.toLocaleString("ar-EG")})</h2>
      {projects.length === 0 ? <p className="card text-stone-500">لسه مفيش مشروع للعميل ده.</p> : null}
      {projects.map((project) => {
        const totals = projectTotals(state, project.id);
        const over = totals.spent > totals.received;
        return (
          <article key={project.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-3">
              <ProjectLink project={project} />
              <StatusPill status={project.status} />
            </div>
            <p className="text-sm text-stone-500">
              إجمالي المستلم <span className="font-black">{formatMoney(totals.received)}</span>
            </p>
            {over ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">
                المصروفات تتجاوز المستلم
              </p>
            ) : null}
          </article>
        );
      })}
      {projects.length > 0 ? (
        <div className="card text-sm">
          <p className="font-bold">الإجمالي على كل المشاريع</p>
          <p className="mt-1 text-stone-500">
            إجمالي المستلم <span className="font-black text-stone-900">{formatMoney(receivedTotal)}</span>
          </p>
        </div>
      ) : null}
      <MovementLog
        title={`سجل المدفوعات (${payments.length.toLocaleString("ar-EG")})`}
        rows={payments}
        amountOf={(tx) => tx.amount}
      />
    </div>
  );
}

function MovementLog({
  title,
  rows,
  amountOf,
}: {
  title: string;
  rows: Transaction[];
  amountOf: (tx: Transaction) => number;
}) {
  const { state } = useStore();
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-stone-500">{title}</h2>
      {rows.length === 0 ? <p className="card text-stone-500">لسه مفيش حركات.</p> : null}
      {rows.map((tx) => {
        const project = state.projects.find((item) => item.id === tx.projectId);
        const category = state.categories.find((item) => item.id === tx.categoryId);
        return (
          <article key={tx.id} className="card space-y-1 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{project?.name || "مشروع"}</p>
              <p className="font-black">{formatMoney(amountOf(tx))}</p>
            </div>
            <p className="text-stone-500">{formatDay(tx.date)}</p>
            {category ? (
              <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {category.name}
              </span>
            ) : null}
            <p>{tx.notes || "من غير بيان"}</p>
          </article>
        );
      })}
    </section>
  );
}
