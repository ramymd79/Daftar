"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  filterTransactions,
  txAmount,
  txPartyName,
  txTitle,
  type LedgerKind,
  type LedgerSort,
} from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import type { AppState } from "@/lib/types";

const sorts: { id: LedgerSort; label: string }[] = [
  { id: "newest", label: "التاريخ (الأحدث)" },
  { id: "oldest", label: "التاريخ (الأقدم)" },
  { id: "amount_desc", label: "المبلغ (الأكثر)" },
  { id: "amount_asc", label: "المبلغ (الأقل)" },
  { id: "type_purchase", label: "النوع - مشتريات أولًا" },
  { id: "type_client", label: "النوع - عملاء أولًا" },
  { id: "category_az", label: "البند (أ-ي)" },
  { id: "category_za", label: "البند (ي-أ)" },
];

const kinds: { id: LedgerKind; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "purchase", label: "مشتريات" },
  { id: "client", label: "مدفوعات عملاء" },
  { id: "contractor", label: "مدفوعات المقاولين" },
];

const fixedColumns = ["الوصف", "التاريخ", "النوع", "البند", "المبلغ"];

type Draft = {
  sort: LedgerSort;
  kind: LedgerKind;
  categoryId: string;
  from: string;
  to: string;
  min: string;
  max: string;
};

export function Ledger({ state, projectId }: { state: AppState; projectId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [includeParty, setIncludeParty] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [sort, setSort] = useState<LedgerSort>("newest");
  const [kind, setKind] = useState<LedgerKind>("all");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [draft, setDraft] = useState<Draft>({
    sort: "newest",
    kind: "all",
    categoryId: "",
    from: "",
    to: "",
    min: "",
    max: "",
  });

  const minValue = min === "" ? null : Number(min);
  const maxValue = max === "" ? null : Number(max);
  const rows = useMemo(
    () =>
      filterTransactions(state, projectId, {
        query,
        sort,
        kind,
        categoryId,
        from,
        to,
        min: minValue,
        max: maxValue,
      }),
    [state, projectId, query, sort, kind, categoryId, from, to, minValue, maxValue],
  );

  const activeCount =
    Number(kind !== "all") +
    Number(Boolean(categoryId)) +
    Number(sort !== "newest") +
    Number(Boolean(from)) +
    Number(Boolean(to)) +
    Number(min !== "") +
    Number(max !== "");

  const activeChips = [
    sort !== "newest" ? sorts.find((item) => item.id === sort)?.label : "",
    kind !== "all" ? kinds.find((item) => item.id === kind)?.label : "",
    categoryId ? state.categories.find((item) => item.id === categoryId)?.name : "",
    from ? `من ${from}` : "",
    to ? `إلى ${to}` : "",
    min !== "" ? `من ${formatMoney(Number(min))}` : "",
    max !== "" ? `إلى ${formatMoney(Number(max))}` : "",
  ].filter((label): label is string => Boolean(label));

  function currentDraft(): Draft {
    return { sort, kind, categoryId, from, to, min, max };
  }

  function apply() {
    setSort(draft.sort);
    setKind(draft.kind);
    setCategoryId(draft.categoryId);
    setFrom(draft.from);
    setTo(draft.to);
    setMin(draft.min);
    setMax(draft.max);
    setFilterOpen(false);
  }

  function resetDraft() {
    setDraft({ sort: "newest", kind: "all", categoryId: "", from: "", to: "", min: "", max: "" });
  }

  function resetApplied() {
    setSort("newest");
    setKind("all");
    setCategoryId("");
    setFrom("");
    setTo("");
    setMin("");
    setMax("");
    resetDraft();
  }

  function downloadPdf() {
    const params = new URLSearchParams({
      id: projectId,
      sort,
      kind,
      category: categoryId,
      q: query,
      auto: "1",
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (min !== "") params.set("min", min);
    if (max !== "") params.set("max", max);
    if (includeParty) params.set("party", "1");
    if (includeNotes) params.set("notes", "1");
    setPdfOpen(false);
    router.push(`/print/?${params.toString()}`);
  }

  return (
    <section className="space-y-3">
      <input
        className="input"
        placeholder="بحث في الحسابات..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn border border-[var(--brand)] bg-[#f3e6dc] font-bold text-[var(--brand-dark)]"
          onClick={() => {
            setDraft(currentDraft());
            setFilterOpen(true);
          }}
        >
          تصفية وفرز{activeCount > 0 ? ` ${activeCount}` : ""}
        </button>
        <button type="button" className="btn btn-secondary font-bold" onClick={() => setPdfOpen(true)}>
          تحميل PDF
        </button>
      </div>
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((label) => (
            <span
              key={label}
              className="rounded-full border border-[var(--brand)] bg-[#f3e6dc] px-3 py-1 text-sm font-bold"
            >
              {label}
            </span>
          ))}
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={resetApplied}>
            إعادة تعيين
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="card text-sm text-stone-500">مفيش حركات بالمواصفات دي.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((tx) => {
            const category = state.categories.find((item) => item.id === tx.categoryId);
            const party = txPartyName(state, tx);
            const expense = tx.type === "expense";
            return (
              <li key={tx.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{txTitle(tx, category?.name)}</p>
                    {party ? <p className="mt-1 text-sm text-stone-500">{party}</p> : null}
                    {category ? (
                      <span className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold">
                        {category.name}
                      </span>
                    ) : null}
                  </div>
                  {tx.attachmentDataUrl ? (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-lg" aria-label="مرفق">
                      ▣
                    </span>
                  ) : null}
                  <div>
                    <p className={`text-lg font-black ${expense ? "text-rose-700" : "text-emerald-700"}`}>
                      {expense ? formatMoney(-txAmount(tx)) : formatMoney(txAmount(tx))}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">{formatDay(tx.date)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
          <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-3xl bg-[var(--bg)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={resetDraft}>
                إعادة تعيين
              </button>
              <h2 className="font-black">تصفية وفرز</h2>
              <button type="button" className="text-xl" onClick={() => setFilterOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <p className="mb-2 text-sm font-bold">الترتيب</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {sorts.map((item) => (
                <Chip key={item.id} active={draft.sort === item.id} onClick={() => setDraft({ ...draft, sort: item.id })}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">النوع</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {kinds.map((item) => (
                <Chip key={item.id} active={draft.kind === item.id} onClick={() => setDraft({ ...draft, kind: item.id })}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">البند</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <Chip active={draft.categoryId === ""} onClick={() => setDraft({ ...draft, categoryId: "" })}>
                الكل
              </Chip>
              {state.categories.map((category) => (
                <Chip
                  key={category.id}
                  active={draft.categoryId === category.id}
                  onClick={() => setDraft({ ...draft, categoryId: category.id })}
                >
                  {category.name}
                </Chip>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">الفترة</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <label className="text-sm font-semibold">
                من تاريخ
                <input
                  className="input mt-1"
                  type="date"
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                إلى تاريخ
                <input
                  className="input mt-1"
                  type="date"
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
              </label>
            </div>
            <p className="mb-2 text-sm font-bold">نطاق المبلغ</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <label className="text-sm font-semibold">
                الحد الأدنى
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft.min}
                  onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                الحد الأقصى
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={draft.max}
                  onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary" onClick={apply}>
                تطبيق الفلاتر
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setFilterOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pdfOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--bg)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="w-6" />
              <h2 className="font-black">تحميل PDF</h2>
              <button type="button" className="text-xl" onClick={() => setPdfOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <p className="mb-2 text-sm font-bold">أعمدة ثابتة</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {fixedColumns.map((label) => (
                <span key={label} className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-bold">
                  {label}
                </span>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">أعمدة اختيارية</p>
            <div className="mb-4 space-y-2">
              <label className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-bold">
                المورد / المقاول
                <input type="checkbox" checked={includeParty} onChange={(e) => setIncludeParty(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-bold">
                الملاحظات
                <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary" onClick={downloadPdf}>
                تحميل PDF
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPdfOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-2 text-sm font-bold ${
        active ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
