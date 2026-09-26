"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractBudgetFields } from "@/components/ContractBudgetFields";
import { projectMoney, statusLabel } from "@/lib/logic";
import { budgetFieldError, formatMoney, parseUserNumber } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ContractType, ProjectStatus } from "@/lib/types";

type Step = "list" | "basics" | "client" | "newClient" | "status" | "budget";
type ProjectSort =
  | "active_first"
  | "done_first"
  | "newest"
  | "oldest"
  | "name_az"
  | "name_za"
  | "start_old"
  | "start_new";

const sortOptions: { id: ProjectSort; label: string }[] = [
  { id: "active_first", label: "الحالة قيد التنفيذ أولًا" },
  { id: "done_first", label: "الحالة المنتهي أولًا" },
  { id: "newest", label: "الأحدث" },
  { id: "oldest", label: "الأقدم" },
  { id: "name_az", label: "الاسم أ-ي" },
  { id: "name_za", label: "الاسم ي-أ" },
  { id: "start_old", label: "تاريخ البدء الأقدم" },
  { id: "start_new", label: "تاريخ البدء الأحدث" },
];

function shownAmount(value: number) {
  return value === 0 ? "·" : formatMoney(value);
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
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

function FieldHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="mb-1 flex items-center justify-between text-sm font-bold">
      <span>{label}</span>
      <span className="font-normal text-stone-400">{hint}</span>
    </span>
  );
}

function WizardTabs({
  active,
  onBasics,
  onBudget,
}: {
  active: "basics" | "budget";
  onBasics: () => void;
  onBudget: () => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 text-center text-sm font-bold">
      <button
        type="button"
        className={`border-b-2 pb-2 ${active === "basics" ? "border-[var(--brand)] text-stone-900" : "border-stone-200 text-stone-400"}`}
        onClick={onBasics}
      >
        الأساسيات
      </button>
      <button
        type="button"
        className={`border-b-2 pb-2 ${active === "budget" ? "border-[var(--brand)] text-stone-900" : "border-stone-200 text-stone-400"}`}
        onClick={onBudget}
      >
        الميزانية
      </button>
    </div>
  );
}

function sortProjects<T extends { createdAt: string; name: string; status: ProjectStatus }>(list: T[], key: ProjectSort): T[] {
  const copy = [...list];
  if (key === "active_first") {
    return copy.sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
  }
  if (key === "done_first") {
    return copy.sort((a, b) => Number(b.status === "done") - Number(a.status === "done"));
  }
  if (key === "oldest" || key === "start_old") {
    return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  if (key === "name_az") return copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (key === "name_za") return copy.sort((a, b) => b.name.localeCompare(a.name, "ar"));
  return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const statuses: ProjectStatus[] = [
  "not_started",
  "active",
  "paused",
  "done",
  "cancelled",
];

export default function ProjectsPage() {
  const { state, addProject, addClient } = useStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>("list");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("not_started");
  const [contractType, setContractType] = useState<ContractType>("percent");
  const [contractTotal, setContractTotal] = useState("");
  const [supervisionPct, setSupervisionPct] = useState("15");
  const [supervisionAmount, setSupervisionAmount] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ProjectSort>("active_first");
  const [draftSort, setDraftSort] = useState<ProjectSort>("active_first");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [draftStatus, setDraftStatus] = useState<ProjectStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [draftClient, setDraftClient] = useState("all");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [afterClient, setAfterClient] = useState<"basics" | "budget">("basics");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newExtraOpen, setNewExtraOpen] = useState(false);
  const [newExtraPhone, setNewExtraPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAttachment, setNewAttachment] = useState("");
  const [contactsDenied, setContactsDenied] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  function reset() {
    setStep("list");
    setName("");
    setClientId("");
    setStatus("not_started");
    setContractType("percent");
    setContractTotal("");
    setSupervisionPct("15");
    setSupervisionAmount("");
    setClientQuery("");
    setAfterClient("basics");
    setNotice("");
    resetNewClient();
  }

  function resetNewClient() {
    setNewName("");
    setNewPhone("");
    setNewExtraOpen(false);
    setNewExtraPhone("");
    setNewEmail("");
    setNewNotes("");
    setNewAttachment("");
    setContactsDenied(false);
    setSaveFailed(false);
  }

  function budgetError() {
    return budgetFieldError({ contractType, contractTotal, supervisionPct, supervisionAmount });
  }

  function commit(chosenClientId: string) {
    if (!name.trim()) {
      setNotice("اكتب اسم المشروع");
      setStep("basics");
      return;
    }
    if (!chosenClientId) {
      setNotice("اختار العميل");
      setAfterClient("budget");
      setStep("client");
      return;
    }
    const problem = budgetError();
    if (problem) {
      setNotice(problem);
      setStep("budget");
      return;
    }
    const id = addProject({
      name,
      clientId: chosenClientId,
      status,
      contractType,
      contractTotal: parseUserNumber(contractTotal) || 0,
      supervisionPct: contractType === "percent" ? parseUserNumber(supervisionPct) || 0 : 0,
      supervisionAmount: contractType === "fixed" ? parseUserNumber(supervisionAmount) || 0 : null,
    });
    reset();
    router.push(`/project/?id=${encodeURIComponent(id)}`);
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    commit(clientId);
  }

  function pickExisting(id: string) {
    setClientId(id);
    setNotice("");
    setStep(afterClient);
  }

  function openNewClient() {
    resetNewClient();
    setStep("newClient");
  }

  async function fromContacts() {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
      };
    };
    if (!nav.contacts?.select) {
      setContactsDenied(true);
      return;
    }
    try {
      const picked = await nav.contacts.select(["name", "tel", "email"], { multiple: false });
      const first = picked[0];
      if (!first) return;
      if (first.name?.[0]) setNewName(first.name[0]);
      if (first.tel?.[0]) setNewPhone(localPhone(first.tel[0]));
      if (first.email?.[0]) setNewEmail(first.email[0]);
    } catch {
      setContactsDenied(true);
    }
  }

  function saveNewClient(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim() || !digitsOnly(newPhone)) {
      setSaveFailed(true);
      return;
    }
    const id = addClient({
      name: newName,
      phone: `+20 ${digitsOnly(newPhone)}`,
      extraPhone: newExtraOpen && digitsOnly(newExtraPhone) ? `+20 ${digitsOnly(newExtraPhone)}` : undefined,
      email: newEmail,
      notes: newNotes,
      attachmentDataUrl: newAttachment || undefined,
    });
    resetNewClient();
    pickExisting(id);
  }

  if (step === "newClient") {
    return (
      <AppShell
        title="عميل جديد"
        action={
          <button type="button" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-lg" aria-label="رجوع" onClick={() => setStep("client")}>
            →
          </button>
        }
      >
        <form onSubmit={saveNewClient} className="space-y-3" noValidate>
          {saveFailed ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm">
              <p className="font-black text-rose-800">لم يتم الحفظ</p>
              <p className="mt-1 text-rose-700">راجع الحقول المطلوبة قبل الحفظ.</p>
            </div>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-sm font-bold text-[var(--brand)]"
            onClick={() => void fromContacts()}
          >
            استيراد من جهات الاتصال
          </button>
          <label className="block">
            <FieldHint label="الاسم الكامل" hint="مطلوب" />
            <input
              className={`input ${saveFailed && !newName.trim() ? "border-rose-400" : ""}`}
              placeholder="مثال: أحمد محمد حسن"
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
                setSaveFailed(false);
              }}
            />
          </label>
          <div>
            <FieldHint label="رقم الهاتف" hint="مطلوب" />
            <div className={`flex items-center gap-2 rounded-2xl border bg-white px-2 ${saveFailed && !digitsOnly(newPhone) ? "border-rose-400" : "border-stone-200"}`}>
              <span className="shrink-0 rounded-xl bg-[#f3e6dc] px-3 py-2 text-sm font-bold">مصر +20</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none"
                dir="ltr"
                inputMode="tel"
                placeholder="100 123 4567"
                value={newPhone}
                onChange={(event) => {
                  setNewPhone(digitsOnly(event.target.value));
                  setSaveFailed(false);
                }}
              />
            </div>
            {saveFailed && !digitsOnly(newPhone) ? (
              <p className="mt-1 text-sm font-bold text-rose-700">رقم الهاتف غير صالح</p>
            ) : null}
          </div>
          {newExtraOpen ? (
            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-2">
              <span className="shrink-0 rounded-xl bg-[#f3e6dc] px-3 py-2 text-sm font-bold">مصر +20</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none"
                dir="ltr"
                inputMode="tel"
                aria-label="رقم هاتف آخر"
                value={newExtraPhone}
                onChange={(event) => setNewExtraPhone(digitsOnly(event.target.value))}
              />
            </div>
          ) : (
            <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setNewExtraOpen(true)}>
              + إضافة رقم هاتف آخر
            </button>
          )}
          <label className="block">
            <FieldHint label="البريد الإلكتروني (لازم لدعوته لبوابة العميل)" hint="اختياري" />
            <input
              className="input"
              dir="ltr"
              inputMode="email"
              placeholder="client@example.com"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <FieldHint label="ملاحظات" hint="اختياري" />
            <textarea
              className="input min-h-24"
              placeholder="أي تفاصيل إضافية عن العميل..."
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
            />
          </label>
          <div>
            <FieldHint label="مرفقات" hint="اختياري" />
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-600">
              {newAttachment ? "المرفق اتضاف" : "اضغط لالتقاط أو رفع ملف"}
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNewAttachment(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setStep("client")}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary">
              + حفظ العميل
            </button>
          </div>
        </form>
        {contactsDenied ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 text-center">
              <p className="font-black">الوصول لجهات الاتصال مرفوض</p>
              <p className="text-sm leading-7 text-stone-600">
                لا يمكن قراءة جهات الاتصال بدون إذن. افتح الإعدادات واسمح للتطبيق بالوصول لجهات الاتصال ثم حاول مرة أخرى.
              </p>
              <button type="button" className="btn btn-secondary w-full" onClick={() => setContactsDenied(false)}>
                إلغاء
              </button>
            </div>
          </div>
        ) : null}
      </AppShell>
    );
  }

  if (step === "client") {
    const visibleClients = state.clients.filter((client) => {
      const needle = clientQuery.trim();
      if (!needle) return true;
      return [client.name, client.phone || ""].join(" ").includes(needle);
    });
    return (
      <AppShell
        title="اختر العميل"
        action={
          <button type="button" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-lg" aria-label="رجوع" onClick={() => setStep("basics")}>
            →
          </button>
        }
      >
        <div className="space-y-3">
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <input
            className="input"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
          />
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-right"
            onClick={openNewClient}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-xl text-white">+</span>
            <span className="font-bold text-[var(--brand)]">أضف عميل جديد</span>
          </button>
          {visibleClients.length === 0 ? (
            <p className="card text-center text-stone-500">لا يوجد عملاء</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-stone-500">الأخيرين</p>
              {visibleClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={`card flex w-full items-center justify-between gap-3 text-right ${
                    clientId === client.id ? "border-[var(--brand)] bg-[#f3e6dc]" : ""
                  }`}
                  onClick={() => pickExisting(client.id)}
                >
                  <span
                    className={`h-5 w-5 shrink-0 rounded-full border ${
                      clientId === client.id ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{client.name}</span>
                    {client.phone ? (
                      <span className="mt-1 inline-flex rounded-full bg-[#f3e6dc] px-2 py-0.5 text-xs" dir="ltr">
                        {displayPhone(client.phone)}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  if (step === "status") {
    return (
      <AppShell
        title="حالة المشروع"
        action={
          <button type="button" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-lg" aria-label="رجوع" onClick={() => setStep("basics")}>
            →
          </button>
        }
      >
        <div className="space-y-2">
          {statuses.map((item) => {
            const selected = status === item;
            return (
              <button
                key={item}
                type="button"
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 ${
                  selected ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"
                }`}
                onClick={() => {
                  setStatus(item);
                  setStep("basics");
                }}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full border text-xs text-white ${
                    selected ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
                  }`}
                >
                  {selected ? "✓" : ""}
                </span>
                <span className="font-bold">{statusLabel(item)}</span>
              </button>
            );
          })}
        </div>
      </AppShell>
    );
  }

  if (step === "basics") {
    const client = state.clients.find((item) => item.id === clientId);
    return (
      <AppShell
        title="مشروع جديد"
        action={
          <button type="button" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-lg" aria-label="رجوع" onClick={reset}>
            →
          </button>
        }
      >
        <WizardTabs active="basics" onBasics={() => setStep("basics")} onBudget={() => setStep("budget")} />
        <div className="space-y-3">
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <label className="block">
            <FieldHint label="اسم المشروع" hint="مطلوب" />
            <input
              className="input"
              placeholder="مثال: فيلا الشيخ زايد"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setNotice("");
              }}
            />
          </label>
          <div>
            <FieldHint label="العميل" hint="مطلوب" />
            <button
              type="button"
              className="input flex w-full items-center justify-between text-right"
              onClick={() => {
                setAfterClient("basics");
                setNotice("");
                setStep("client");
              }}
            >
              <span className={client ? "font-bold" : "text-stone-400"}>{client?.name || "اختر العميل..."}</span>
              <span className="text-stone-400">▾</span>
            </button>
          </div>
          <div>
            <FieldHint label="حالة المشروع" hint="مطلوب" />
            <button type="button" className="input flex w-full items-center justify-between text-right" onClick={() => setStep("status")}>
              <span className="font-bold">{statusLabel(status)}</span>
              <span className="text-stone-400">▾</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={reset}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!name.trim()) {
                  setNotice("اكتب اسم المشروع");
                  return;
                }
                if (!clientId) {
                  setNotice("اختار العميل");
                  setAfterClient("budget");
                  setStep("client");
                  return;
                }
                setNotice("");
                setStep("budget");
              }}
            >
              التالي ←
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (step === "budget") {
    return (
      <AppShell
        title="مشروع جديد"
        action={
          <button type="button" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-lg" aria-label="رجوع" onClick={() => setStep("basics")}>
            →
          </button>
        }
      >
        <WizardTabs active="budget" onBasics={() => setStep("basics")} onBudget={() => setStep("budget")} />
        <form onSubmit={onSave} noValidate className="space-y-3">
          <ContractBudgetFields
            contractType={contractType}
            onContractType={(type) => {
              setContractType(type);
              setNotice("");
              if (type === "percent" && !supervisionPct.trim()) {
                const amount = parseUserNumber(supervisionAmount);
                if (amount != null && amount >= 0 && amount <= 100) setSupervisionPct(String(amount));
                else setSupervisionPct("15");
              }
              if (type === "fixed" && !supervisionAmount.trim()) {
                const total = parseUserNumber(contractTotal) || 0;
                const pct = parseUserNumber(supervisionPct) || 0;
                if (total > 0 && pct > 0) setSupervisionAmount(String(Math.round((total * pct) / 100)));
              }
            }}
            contractTotal={contractTotal}
            onContractTotal={(value) => {
              setContractTotal(value);
              setNotice("");
            }}
            supervisionPct={supervisionPct}
            onSupervisionPct={(value) => {
              setSupervisionPct(value);
              setNotice("");
            }}
            supervisionAmount={supervisionAmount}
            onSupervisionAmount={(value) => {
              setSupervisionAmount(value);
              setNotice("");
            }}
          />
          <div className="sticky bottom-24 z-30 space-y-2 bg-[var(--bg)] py-3">
            {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setStep("basics")}>
                السابق
              </button>
              <button type="submit" className="btn btn-primary">
                ✓ إنشاء المشروع
              </button>
            </div>
          </div>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="المشاريع"
      showFab
      onFabClick={() => setStep("basics")}
      action={
        <button type="button" className="btn btn-primary text-sm" onClick={() => setStep("basics")}>
          مشروع جديد
        </button>
      }
    >
      {state.projects.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-lg font-black">لا توجد مشاريع</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-stone-500">
            ابدأ بإضافة أول مشروع وتتبع الميزانية والمقاولين والتقدم.
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => setStep("basics")}>
            مشروع جديد
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="input min-w-0 flex-1"
              placeholder="بحث بالاسم أو العميل..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-white font-black"
              aria-label="تصفية وفرز"
              onClick={() => {
                setDraftSort(sortKey);
                setDraftStatus(statusFilter);
                setDraftClient(clientFilter);
                setDraftFrom(fromDay);
                setDraftTo(toDay);
                setFilterOpen(true);
              }}
            >
              ≡
            </button>
          </div>
          {sortProjects(
            state.projects.filter((project) => {
              const text = query.trim();
              const client = state.clients.find((item) => item.id === project.clientId);
              if (text && !project.name.includes(text) && !(client?.name || "").includes(text)) return false;
              if (statusFilter !== "all" && project.status !== statusFilter) return false;
              if (clientFilter !== "all" && project.clientId !== clientFilter) return false;
              const day = project.createdAt.slice(0, 10);
              if (fromDay && day < fromDay) return false;
              if (toDay && day > toDay) return false;
              return true;
            }),
            sortKey,
          ).map((project) => {
            const client = state.clients.find((item) => item.id === project.clientId);
            const money = projectMoney(state, project.id);
            const ratio = project.contractTotal > 0 ? Math.min(100, (money.received / project.contractTotal) * 100) : 0;
            return (
              <Link
                key={project.id}
                href={`/project/?id=${encodeURIComponent(project.id)}`}
                className="card block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{project.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{client?.name || "بدون عميل"}</p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">
                    {statusLabel(project.status)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-[var(--brand)]" style={{ width: `${ratio}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xs text-stone-500">المستلم</p>
                    <p className="text-lg font-black">{shownAmount(money.received)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">المصروفات</p>
                    <p className="text-lg font-black text-[#b4533a]">{shownAmount(money.spent)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {filterOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
          <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => setFilterOpen(false)} />
          <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-bold text-[var(--brand)]"
                onClick={() => {
                  setDraftSort("active_first");
                  setDraftStatus("all");
                  setDraftClient("all");
                  setDraftFrom("");
                  setDraftTo("");
                }}
              >
                إعادة تعيين
              </button>
              <p className="font-black">تصفية وفرز</p>
              <span className="w-16" />
            </div>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <label key={option.id} className="card flex items-center justify-between">
                  <span>{option.label}</span>
                  <input type="radio" name="project-sort" checked={draftSort === option.id} onChange={() => setDraftSort(option.id)} />
                </label>
              ))}
            </div>
            <p className="mb-2 mt-4 text-sm font-bold">العميل</p>
            <div className="space-y-2">
              <label className="card flex items-center justify-between">
                <span>كل العملاء</span>
                <input type="radio" name="project-client" checked={draftClient === "all"} onChange={() => setDraftClient("all")} />
              </label>
              {state.clients.map((person) => {
                const count = state.projects.filter((project) => project.clientId === person.id).length;
                return (
                  <label key={person.id} className="card flex items-center justify-between">
                    <span>
                      {person.name}
                      <span className="mr-2 text-xs text-stone-500">{count.toLocaleString("ar-EG")}</span>
                    </span>
                    <input type="radio" name="project-client" checked={draftClient === person.id} onChange={() => setDraftClient(person.id)} />
                  </label>
                );
              })}
            </div>
            <p className="mb-2 mt-4 text-sm font-bold">الحالة</p>
            <div className="flex flex-wrap gap-2">
              {(["all", ...statuses] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm font-bold ${draftStatus === item ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"}`}
                  onClick={() => setDraftStatus(item)}
                >
                  {item === "all" ? "الكل" : statusLabel(item)}
                </button>
              ))}
            </div>
            <p className="mb-2 mt-4 text-sm font-bold">الفترة</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                من تاريخ
                <input className="input mt-1" type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} />
              </label>
              <label className="text-sm">
                إلى تاريخ
                <input className="input mt-1" type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSortKey(draftSort);
                  setStatusFilter(draftStatus);
                  setClientFilter(draftClient);
                  setFromDay(draftFrom);
                  setToDay(draftTo);
                  setFilterOpen(false);
                }}
              >
                تطبيق الفلاتر
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setFilterOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
