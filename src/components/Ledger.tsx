"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterTransactions,
  txAmount,
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

export function Ledger({ state, projectId }: { state: AppState; projectId: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<LedgerSort>("newest");
  const [kind, setKind] = useState<LedgerKind>("all");
  const [categoryId, setCategoryId] = useState("");
  const [draftSort, setDraftSort] = useState<LedgerSort>("newest");
  const [draftKind, setDraftKind] = useState<LedgerKind>("all");
  const [draftCategory, setDraftCategory] = useState("");

  const rows = useMemo(
    () => filterTransactions(state, projectId, { query, sort, kind, categoryId }),
    [state, projectId, query, sort, kind, categoryId],
  );
  const activeCount = Number(kind !== "all") + Number(Boolean(categoryId)) + Number(sort !== "newest");
  const printHref = `/print/?id=${encodeURIComponent(projectId)}&sort=${sort}&kind=${kind}&category=${encodeURIComponent(categoryId)}&q=${encodeURIComponent(query)}`;

  function apply() {
    setSort(draftSort);
    setKind(draftKind);
    setCategoryId(draftCategory);
    setOpen(false);
  }

  function resetDraft() {
    setDraftSort("newest");
    setDraftKind("all");
    setDraftCategory("");
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
        <Link href={printHref} className="btn btn-secondary">
          تحميل PDF
        </Link>
        <button
          type="button"
          className="btn border border-[var(--brand)] bg-[#f3e6dc] font-bold text-[var(--brand-dark)]"
          onClick={() => {
            setDraftSort(sort);
            setDraftKind(kind);
            setDraftCategory(categoryId);
            setOpen(true);
          }}
        >
          تصفية وفرز{activeCount > 0 ? ` ${activeCount}` : ""}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="card text-sm text-stone-500">مفيش حركات بالمواصفات دي.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((tx) => {
            const category = state.categories.find((item) => item.id === tx.categoryId);
            const title =
              tx.notes ||
              (tx.type === "client_payment" ? "دفعة من العميل" : category?.name || "مصروف");
            return (
              <li key={tx.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{formatMoney(txAmount(tx))}</p>
                    <p className="mt-1 text-sm text-stone-500">{formatDay(tx.date)}</p>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-bold">{title}</p>
                    {category ? (
                      <span className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold">
                        {category.name}
                      </span>
                    ) : null}
                  </div>
                  {tx.attachmentDataUrl ? (
                    tx.attachmentDataUrl.startsWith("data:image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tx.attachmentDataUrl}
                        alt="مرفق"
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-stone-100 text-xs">ملف</span>
                    )
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-stone-50 text-xs text-stone-300">
                      —
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
          <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-3xl bg-[var(--bg)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={resetDraft}>
                إعادة تعيين
              </button>
              <h2 className="font-black">تصفية وفرز</h2>
              <button type="button" className="text-xl" onClick={() => setOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <p className="mb-2 text-sm font-bold">الترتيب</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {sorts.map((item) => (
                <Chip key={item.id} active={draftSort === item.id} onClick={() => setDraftSort(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">النوع</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {kinds.map((item) => (
                <Chip key={item.id} active={draftKind === item.id} onClick={() => setDraftKind(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>
            <p className="mb-2 text-sm font-bold">البند</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <Chip active={draftCategory === ""} onClick={() => setDraftCategory("")}>
                الكل
              </Chip>
              {state.categories.map((category) => (
                <Chip
                  key={category.id}
                  active={draftCategory === category.id}
                  onClick={() => setDraftCategory(category.id)}
                >
                  {category.name}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary" onClick={apply}>
                تطبيق الفلاتر
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
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
