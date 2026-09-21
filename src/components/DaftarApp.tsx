"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Expense,
  ExpenseCategory,
  Payment,
  ProfitMode,
  Project,
} from "@/lib/types";
import { EXPENSE_LABELS, PROFIT_MODE_LABELS } from "@/lib/types";
import {
  expensesByCategory,
  formatEgp,
  officeProfit,
  remainingCash,
  sumExpenses,
  sumPayments,
  uid,
} from "@/lib/money";
import { loadStore, saveStore, seedDemoProjects } from "@/lib/storage";

type View = "home" | "project" | "client";
type Tab = "overview" | "payments" | "expenses" | "settings";

const emptyProjectForm = {
  name: "",
  clientName: "",
  address: "",
  profitMode: "percent" as ProfitMode,
  profitPercent: 15,
  fixedFee: 50000,
  contractPrice: 350000,
};

export default function DaftarApp() {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<View>("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyProjectForm);

  const [payForm, setPayForm] = useState({
    date: "",
    amount: "",
    note: "",
  });
  const [expForm, setExpForm] = useState({
    date: "",
    amount: "",
    category: "plumbing" as ExpenseCategory,
    note: "",
    photoDataUrl: "",
  });

  useEffect(() => {
    const store = loadStore();
    setProjects(store.projects);
    setReady(true);
    const today = new Date().toISOString().slice(0, 10);
    setPayForm((p) => ({ ...p, date: today }));
    setExpForm((e) => ({ ...e, date: today }));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStore({ version: 1, projects });
  }, [projects, ready]);

  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId],
  );

  function openProject(id: string, asClient = false) {
    setActiveId(id);
    setTab("overview");
    setView(asClient ? "client" : "project");
  }

  function createProject() {
    if (!form.name.trim() || !form.clientName.trim()) return;
    const project: Project = {
      id: uid("prj"),
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      address: form.address.trim() || "—",
      status: "active",
      profitMode: form.profitMode,
      profitPercent: Number(form.profitPercent) || 0,
      fixedFee: Number(form.fixedFee) || 0,
      contractPrice: Number(form.contractPrice) || 0,
      payments: [],
      expenses: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setProjects((prev) => [project, ...prev]);
    setForm(emptyProjectForm);
    setShowNew(false);
    openProject(project.id);
  }

  function loadDemo() {
    const seeded = seedDemoProjects();
    setProjects(seeded);
    openProject(seeded[0].id);
  }

  function clearAll() {
    if (!confirm("مسح كل المشاريع من هذا المتصفح؟")) return;
    setProjects([]);
    setActiveId(null);
    setView("home");
  }

  function updateActive(mutator: (p: Project) => Project) {
    if (!activeId) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === activeId ? mutator(p) : p)),
    );
  }

  function addPayment() {
    const amount = Number(payForm.amount);
    if (!amount || !payForm.date) return;
    const payment: Payment = {
      id: uid("pay"),
      date: payForm.date,
      amount,
      note: payForm.note.trim(),
    };
    updateActive((p) => ({ ...p, payments: [payment, ...p.payments] }));
    setPayForm((f) => ({ ...f, amount: "", note: "" }));
  }

  function addExpense() {
    const amount = Number(expForm.amount);
    if (!amount || !expForm.date) return;
    const expense: Expense = {
      id: uid("exp"),
      date: expForm.date,
      amount,
      category: expForm.category,
      note: expForm.note.trim(),
      photoDataUrl: expForm.photoDataUrl || undefined,
    };
    updateActive((p) => ({ ...p, expenses: [expense, ...p.expenses] }));
    setExpForm((f) => ({
      ...f,
      amount: "",
      note: "",
      photoDataUrl: "",
    }));
  }

  function onPhoto(file: File | null) {
    if (!file) {
      setExpForm((f) => ({ ...f, photoDataUrl: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setExpForm((f) => ({
        ...f,
        photoDataUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  }

  function removePayment(id: string) {
    updateActive((p) => ({
      ...p,
      payments: p.payments.filter((x) => x.id !== id),
    }));
  }

  function removeExpense(id: string) {
    updateActive((p) => ({
      ...p,
      expenses: p.expenses.filter((x) => x.id !== id),
    }));
  }

  function deleteProject() {
    if (!active) return;
    if (!confirm(`حذف مشروع «${active.name}»؟`)) return;
    setProjects((prev) => prev.filter((p) => p.id !== active.id));
    setActiveId(null);
    setView("home");
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <p className="text-[var(--ink-soft)]">جارٍ فتح الدفتر…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            type="button"
            className="brand-mark hero-brand"
            onClick={() => {
              setView("home");
              setActiveId(null);
            }}
          >
            دفتر
          </button>
          <p className="mt-1 max-w-xl text-[var(--ink-soft)]">
            دفتر فلوس لمشاريع التشطيب — مدفوعات العميل، مصروفات البنود، والأرباح
            أول بأول. البيانات على هذا المتصفح فقط.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {view !== "home" && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setView("home");
                setActiveId(null);
              }}
            >
              كل المشاريع
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNew(true)}
          >
            مشروع جديد
          </button>
        </div>
      </header>

      {view === "home" && (
        <section className="fade-in space-y-5">
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">مشاريعك</h2>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  أربعة أرقام جاهزة لكل مشروع: المدفوع، المصروف، المتبقي، وربح
                  المكتب.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {projects.length === 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={loadDemo}
                  >
                    تحميل مثال
                  </button>
                )}
                {projects.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={clearAll}
                  >
                    مسح الكل
                  </button>
                )}
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-8 text-center">
                <p className="text-lg font-semibold">مفيش مشاريع لسه</p>
                <p className="mt-2 text-[var(--ink-soft)]">
                  ابدأ بمشروع جديد، أو حمّل مثالاً جاهزاً للتجربة.
                </p>
              </div>
            ) : (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="panel w-full p-4 text-right transition hover:-translate-y-0.5"
                      onClick={() => openProject(p.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="mt-1 text-sm text-[var(--ink-soft)]">
                            {p.clientName} · {p.address}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--paper-deep)] px-2.5 py-1 text-xs">
                          {p.status === "active"
                            ? "جارٍ"
                            : p.status === "paused"
                              ? "متوقف"
                              : "منتهي"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span>مدفوع: {formatEgp(sumPayments(p))}</span>
                        <span>مصروف: {formatEgp(sumExpenses(p))}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {view === "project" && active && (
        <ProjectWorkspace
          project={active}
          tab={tab}
          setTab={setTab}
          payForm={payForm}
          setPayForm={setPayForm}
          expForm={expForm}
          setExpForm={setExpForm}
          onAddPayment={addPayment}
          onAddExpense={addExpense}
          onPhoto={onPhoto}
          onRemovePayment={removePayment}
          onRemoveExpense={removeExpense}
          onUpdate={updateActive}
          onClientView={() => setView("client")}
          onDelete={deleteProject}
        />
      )}

      {view === "client" && active && (
        <ClientPortal
          project={active}
          onBack={() => setView("project")}
        />
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div className="panel fade-in w-full max-w-lg p-5 sm:p-6">
            <h3 className="text-lg font-bold">مشروع تشطيب جديد</h3>
            <div className="mt-4 grid gap-3">
              <div className="field">
                <label htmlFor="name">اسم المشروع</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="مثلاً: شقة التجمع"
                />
              </div>
              <div className="field">
                <label htmlFor="client">اسم العميل</label>
                <input
                  id="client"
                  value={form.clientName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientName: e.target.value }))
                  }
                  placeholder="اسم العميل"
                />
              </div>
              <div className="field">
                <label htmlFor="address">العنوان</label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="المنطقة / المدينة"
                />
              </div>
              <div className="field">
                <label htmlFor="mode">طريقة ربح المكتب</label>
                <select
                  id="mode"
                  value={form.profitMode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      profitMode: e.target.value as ProfitMode,
                    }))
                  }
                >
                  {Object.entries(PROFIT_MODE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {form.profitMode === "percent" && (
                <div className="field">
                  <label htmlFor="pct">النسبة %</label>
                  <input
                    id="pct"
                    type="number"
                    value={form.profitPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        profitPercent: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
              {form.profitMode === "fixed_fee" && (
                <div className="field">
                  <label htmlFor="fee">مبلغ المكتب</label>
                  <input
                    id="fee"
                    type="number"
                    value={form.fixedFee}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fixedFee: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
              {form.profitMode === "fixed_price" && (
                <div className="field">
                  <label htmlFor="price">سعر المقاولة</label>
                  <input
                    id="price"
                    type="number"
                    value={form.contractPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contractPrice: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowNew(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createProject}
              >
                حفظ المشروع
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-soft)]">
        دفتر — تجربة محلية. الأرقام تتحدث قبل ما المشروع يخلص.
      </footer>
    </div>
  );
}

function FourNumbers({ project }: { project: Project }) {
  const rem = remainingCash(project);
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="label">مدفوعات العميل</div>
        <div className="value">{formatEgp(sumPayments(project))}</div>
      </div>
      <div className="stat-card">
        <div className="label">مصروفات المشروع</div>
        <div className="value">{formatEgp(sumExpenses(project))}</div>
      </div>
      <div className="stat-card">
        <div className="label">المتبقي الحسابي</div>
        <div
          className="value"
          style={{ color: rem >= 0 ? "var(--good)" : "var(--bad)" }}
        >
          {formatEgp(rem)}
        </div>
      </div>
      <div className="stat-card">
        <div className="label">ربح المكتب</div>
        <div className="value">{formatEgp(officeProfit(project))}</div>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          {PROFIT_MODE_LABELS[project.profitMode]}
        </p>
      </div>
    </div>
  );
}

function ProjectWorkspace({
  project,
  tab,
  setTab,
  payForm,
  setPayForm,
  expForm,
  setExpForm,
  onAddPayment,
  onAddExpense,
  onPhoto,
  onRemovePayment,
  onRemoveExpense,
  onUpdate,
  onClientView,
  onDelete,
}: {
  project: Project;
  tab: Tab;
  setTab: (t: Tab) => void;
  payForm: { date: string; amount: string; note: string };
  setPayForm: React.Dispatch<
    React.SetStateAction<{ date: string; amount: string; note: string }>
  >;
  expForm: {
    date: string;
    amount: string;
    category: ExpenseCategory;
    note: string;
    photoDataUrl: string;
  };
  setExpForm: React.Dispatch<
    React.SetStateAction<{
      date: string;
      amount: string;
      category: ExpenseCategory;
      note: string;
      photoDataUrl: string;
    }>
  >;
  onAddPayment: () => void;
  onAddExpense: () => void;
  onPhoto: (file: File | null) => void;
  onRemovePayment: (id: string) => void;
  onRemoveExpense: (id: string) => void;
  onUpdate: (mutator: (p: Project) => Project) => void;
  onClientView: () => void;
  onDelete: () => void;
}) {
  const byCat = expensesByCategory(project);

  return (
    <section className="fade-in space-y-4">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="mt-1 text-[var(--ink-soft)]">
              {project.clientName} · {project.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClientView}>
              بوابة العميل
            </button>
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              حذف
            </button>
          </div>
        </div>

        <div className="mt-5">
          <FourNumbers project={project} />
        </div>

        <div className="tabs mt-5">
          {(
            [
              ["overview", "نظرة عامة"],
              ["payments", "مدفوعات"],
              ["expenses", "مصروفات"],
              ["settings", "إعداد الربح"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="panel p-5 sm:p-6">
          <h3 className="font-bold">توزيع المصروفات على البنود</h3>
          {byCat.length === 0 ? (
            <p className="mt-3 text-[var(--ink-soft)]">
              لسه مفيش مصروفات — سجّل أول فاتورة من تبويب المصروفات.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {byCat.map(([cat, total]) => (
                <li
                  key={cat}
                  className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"
                >
                  <span>
                    {EXPENSE_LABELS[cat as ExpenseCategory] ?? cat}
                  </span>
                  <strong>{formatEgp(total)}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            المتبقي هنا = المدفوعات المسجلة ناقص المصروفات المسجلة. مش بالضرورة
            باقي حساب العميل، ومش ربح المكتب.
          </p>
        </div>
      )}

      {tab === "payments" && (
        <div className="panel grid gap-5 p-5 sm:grid-cols-[1fr_1.2fr] sm:p-6">
          <div className="space-y-3">
            <h3 className="font-bold">تسجيل دفعة</h3>
            <div className="field">
              <label htmlFor="pay-date">التاريخ</label>
              <input
                id="pay-date"
                type="date"
                value={payForm.date}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="pay-amount">المبلغ</label>
              <input
                id="pay-amount"
                type="number"
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="مثلاً 50000"
              />
            </div>
            <div className="field">
              <label htmlFor="pay-note">ملاحظة</label>
              <input
                id="pay-note"
                value={payForm.note}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="دفعة تحت الحساب"
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={onAddPayment}>
              إضافة الدفعة
            </button>
          </div>
          <div>
            <h3 className="font-bold">سجل المدفوعات</h3>
            {project.payments.length === 0 ? (
              <p className="mt-3 text-[var(--ink-soft)]">مفيش دفعات لسه.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {project.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-white/70 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold">{formatEgp(p.amount)}</p>
                      <p className="text-sm text-[var(--ink-soft)]">
                        {p.date}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger px-2 py-1 text-sm"
                      onClick={() => onRemovePayment(p.id)}
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className="panel grid gap-5 p-5 sm:grid-cols-[1fr_1.2fr] sm:p-6">
          <div className="space-y-3">
            <h3 className="font-bold">تسجيل مصروف</h3>
            <div className="field">
              <label htmlFor="exp-date">التاريخ</label>
              <input
                id="exp-date"
                type="date"
                value={expForm.date}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="exp-amount">المبلغ</label>
              <input
                id="exp-amount"
                type="number"
                value={expForm.amount}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="exp-cat">البند</label>
              <select
                id="exp-cat"
                value={expForm.category}
                onChange={(e) =>
                  setExpForm((f) => ({
                    ...f,
                    category: e.target.value as ExpenseCategory,
                  }))
                }
              >
                {Object.entries(EXPENSE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="exp-note">ملاحظة</label>
              <input
                id="exp-note"
                value={expForm.note}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="exp-photo">صورة فاتورة (اختياري)</label>
              <input
                id="exp-photo"
                type="file"
                accept="image/*"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
              {expForm.photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expForm.photoDataUrl}
                  alt="معاينة الفاتورة"
                  className="mt-2 max-h-32 rounded-lg border border-[var(--line)]"
                />
              )}
            </div>
            <button type="button" className="btn btn-primary" onClick={onAddExpense}>
              إضافة المصروف
            </button>
          </div>
          <div>
            <h3 className="font-bold">سجل المصروفات</h3>
            {project.expenses.length === 0 ? (
              <p className="mt-3 text-[var(--ink-soft)]">مفيش مصروفات لسه.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {project.expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-white/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{formatEgp(e.amount)}</p>
                      <p className="text-sm text-[var(--ink-soft)]">
                        {e.date} · {EXPENSE_LABELS[e.category]}
                        {e.note ? ` · ${e.note}` : ""}
                      </p>
                      {e.photoDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.photoDataUrl}
                          alt="فاتورة"
                          className="mt-2 max-h-24 rounded-md border border-[var(--line)]"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger px-2 py-1 text-sm"
                      onClick={() => onRemoveExpense(e.id)}
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="panel max-w-lg space-y-3 p-5 sm:p-6">
          <h3 className="font-bold">إعداد طريقة الربح</h3>
          <div className="field">
            <label htmlFor="set-mode">الطريقة</label>
            <select
              id="set-mode"
              value={project.profitMode}
              onChange={(e) =>
                onUpdate((p) => ({
                  ...p,
                  profitMode: e.target.value as ProfitMode,
                }))
              }
            >
              {Object.entries(PROFIT_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {project.profitMode === "percent" && (
            <div className="field">
              <label htmlFor="set-pct">النسبة %</label>
              <input
                id="set-pct"
                type="number"
                value={project.profitPercent}
                onChange={(e) =>
                  onUpdate((p) => ({
                    ...p,
                    profitPercent: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}
          {project.profitMode === "fixed_fee" && (
            <div className="field">
              <label htmlFor="set-fee">مبلغ المكتب</label>
              <input
                id="set-fee"
                type="number"
                value={project.fixedFee}
                onChange={(e) =>
                  onUpdate((p) => ({
                    ...p,
                    fixedFee: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}
          {project.profitMode === "fixed_price" && (
            <div className="field">
              <label htmlFor="set-price">سعر المقاولة</label>
              <input
                id="set-price"
                type="number"
                value={project.contractPrice}
                onChange={(e) =>
                  onUpdate((p) => ({
                    ...p,
                    contractPrice: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          )}
          <p className="text-sm text-[var(--ink-soft)]">
            ربح المكتب الحالي:{" "}
            <strong>{formatEgp(officeProfit(project))}</strong>
          </p>
        </div>
      )}
    </section>
  );
}

function ClientPortal({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  return (
    <section className="fade-in space-y-4">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--ink-soft)]">بوابة العميل — قراءة فقط</p>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="mt-1 text-[var(--ink-soft)]">{project.clientName}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            رجوع للمهندس
          </button>
        </div>
        <div className="mt-5">
          <FourNumbers project={project} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-bold">مدفوعاتك</h3>
          <ul className="mt-3 space-y-2">
            {project.payments.length === 0 && (
              <li className="text-[var(--ink-soft)]">لا توجد دفعات بعد.</li>
            )}
            {project.payments.map((p) => (
              <li key={p.id} className="rounded-xl bg-white/70 px-3 py-2">
                <strong>{formatEgp(p.amount)}</strong>
                <div className="text-sm text-[var(--ink-soft)]">
                  {p.date}
                  {p.note ? ` · ${p.note}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">مصروفات المشروع</h3>
          <ul className="mt-3 space-y-2">
            {project.expenses.length === 0 && (
              <li className="text-[var(--ink-soft)]">لا توجد مصروفات بعد.</li>
            )}
            {project.expenses.map((e) => (
              <li key={e.id} className="rounded-xl bg-white/70 px-3 py-2">
                <strong>{formatEgp(e.amount)}</strong>
                <div className="text-sm text-[var(--ink-soft)]">
                  {e.date} · {EXPENSE_LABELS[e.category]}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
