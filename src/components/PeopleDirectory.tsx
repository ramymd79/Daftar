"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const text = copy[kind];

  const list =
    kind === "clients" ? state.clients : kind === "contractors" ? state.contractors : state.suppliers;
  const selected = list.find((person) => person.id === selectedId);
  const visible = sortedPeople(kind, state, list.filter((person) => personMatches(kind, person, query)), sortKey, chips);

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
        {kind === "suppliers" ? (
          <button
            type="button"
            className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold"
            onClick={() => {
              setDraftSort(sortKey);
              setDraftChips(chips);
              setFilterOpen(true);
            }}
          >
            تصفية
          </button>
        ) : (
          <NotReady label="تصفية" />
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
        </div>
      )}
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
  const trades = tradeNames(
    state,
    kind === "contractors"
      ? expensesForPerson(state, "contractorId", person.id)
      : expensesForPerson(state, "supplierId", person.id),
  );
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
        <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
          الحالة لسه مش شغالة
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
  const { state, updatePerson } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone || "");
  const [email, setEmail] = useState(person.email || "");
  const [notes, setNotes] = useState(person.notes || "");
  const [notice, setNotice] = useState("");
  const text = copy[kind];
  const showEmail = kind !== "contractors";
  const trades = tradeNames(
    state,
    kind === "clients"
      ? []
      : expensesForPerson(state, kind === "contractors" ? "contractorId" : "supplierId", person.id),
  );
  const projects = state.projects.filter((project) => project.clientId === person.id);
  const over =
    kind === "clients" &&
    projects.some((project) => {
      const totals = projectTotals(state, project.id);
      return totals.spent > totals.received;
    });
  const wa = digitsOnly(person.phone || "");

  useEffect(() => {
    setName(person.name);
    setPhone(person.phone || "");
    setEmail(person.email || "");
    setNotes(person.notes || "");
  }, [person.name, person.phone, person.email, person.notes]);

  function savePerson(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب الاسم");
      return;
    }
    updatePerson(
      kind,
      person.id,
      showEmail ? { name, phone, email, notes } : { name, phone, notes },
    );
    setNotice("");
    setEditing(false);
  }

  return (
    <AppShell
      title={text.detail}
      action={
        <div className="flex items-center gap-2">
          <NotReady label="حذف" />
          <button type="button" className="btn btn-secondary px-3 py-2 text-sm" onClick={() => setEditing(true)}>
            تعديل
          </button>
        </div>
      }
    >
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={onBack}>
        رجوع
      </button>
      <p className="mb-3 text-sm text-stone-500">{person.name}</p>
      {editing ? (
        <form onSubmit={savePerson} className="card mb-3 space-y-3" noValidate>
          <p className="font-bold">تعديل البيانات</p>
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          <input
            className="input"
            placeholder="الموبايل (اختياري)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
          />
          {showEmail ? (
            <input
              className="input"
              placeholder="البريد (اختياري)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              inputMode="email"
            />
          ) : null}
          <textarea
            className="input min-h-24"
            placeholder="ملاحظات (اختياري)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ
          </button>
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => {
              setName(person.name);
              setPhone(person.phone || "");
              setEmail(person.email || "");
              setNotes(person.notes || "");
              setNotice("");
              setEditing(false);
            }}
          >
            إلغاء
          </button>
        </form>
      ) : null}
      <div className="card mb-3 text-center">
        <p className="text-xl font-black">{person.name}</p>
        {trades.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {trades.map((trade) => (
              <span key={trade} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {trade}
              </span>
            ))}
          </div>
        ) : null}
        {kind !== "clients" ? (
          <div className="mt-3 flex justify-center">
            <NotReady label="تعديل التخصص" />
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
            {person.phone || "لا يوجد هاتف"}
          </p>
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
        <p className="text-sm text-stone-500">لا يوجد مرفقات</p>
        <NotReady label="إضافة مرفق" />
      </div>
    </AppShell>
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
