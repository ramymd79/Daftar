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

type Step = "list" | "basics" | "client" | "status" | "budget";
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
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [noClient, setNoClient] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>("not_started");
  const [contractType, setContractType] = useState<ContractType>("fixed");
  const [contractTotal, setContractTotal] = useState("");
  const [supervisionPct, setSupervisionPct] = useState("");
  const [supervisionAmount, setSupervisionAmount] = useState("");
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
  const [resumeSave, setResumeSave] = useState(false);
  const [afterClient, setAfterClient] = useState<"basics" | "budget">("basics");
  const [notice, setNotice] = useState("");

  function reset() {
    setStep("list");
    setName("");
    setAddress("");
    setClientId("");
    setNewClient("");
    setNewPhone("");
    setNoClient(false);
    setStatus("not_started");
    setContractType("fixed");
    setContractTotal("");
    setSupervisionPct("");
    setSupervisionAmount("");
    setResumeSave(false);
    setAfterClient("basics");
    setNotice("");
  }

  function budgetError() {
    return budgetFieldError({ contractType, contractTotal, supervisionPct, supervisionAmount });
  }

  function commit(choice: { clientId: string; noClient: boolean; newName?: string; newPhone?: string }) {
    if (!name.trim()) {
      setNotice("اكتب اسم المشروع");
      setResumeSave(false);
      setStep("basics");
      return;
    }
    let cid = choice.clientId;
    if (!cid && choice.newName?.trim()) {
      cid = addClient({ name: choice.newName, phone: choice.newPhone || "" });
    }
    if (!cid && !choice.noClient) {
      setNotice("اختَر العميل، أو سجّل المشروع بدون عميل");
      setResumeSave(true);
      setStep("client");
      return;
    }
    const problem = budgetError();
    if (problem) {
      setNotice(problem);
      setResumeSave(false);
      setStep("budget");
      return;
    }
    const id = addProject({
      name,
      address,
      clientId: cid || "",
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
    commit({ clientId, noClient, newName: newClient, newPhone });
  }

  function pickExisting(id: string) {
    setClientId(id);
    setNewClient("");
    setNewPhone("");
    setNoClient(false);
    setNotice("");
    if (resumeSave) {
      commit({ clientId: id, noClient: false });
      return;
    }
    setStep(afterClient);
  }

  function pickNewClient(event: FormEvent) {
    event.preventDefault();
    if (!newClient.trim()) {
      setNotice("اكتب اسم العميل");
      return;
    }
    setClientId("");
    setNoClient(false);
    setNotice("");
    if (resumeSave) {
      commit({ clientId: "", noClient: false, newName: newClient, newPhone });
      return;
    }
    setStep(afterClient);
  }

  function pickNoClient() {
    setClientId("");
    setNewClient("");
    setNewPhone("");
    setNoClient(true);
    setNotice("");
    if (resumeSave) {
      commit({ clientId: "", noClient: true });
      return;
    }
    setStep(afterClient);
  }

  if (step === "client") {
    return (
      <AppShell title="اختر العميل">
        <div className="space-y-2">
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          {state.clients.map((client) => (
            <button
              key={client.id}
              type="button"
              className={`card flex w-full items-center justify-between text-right ${
                clientId === client.id ? "border-[var(--brand)]" : ""
              }`}
              onClick={() => pickExisting(client.id)}
            >
              <span
                className={`h-5 w-5 rounded-full border ${
                  clientId === client.id
                    ? "border-[var(--brand)] bg-[var(--brand)]"
                    : "border-stone-300"
                }`}
              />
              <span>
                <span className="block font-bold">{client.name}</span>
                {client.phone ? (
                  <span className="text-sm text-stone-500" dir="ltr">
                    {client.phone}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          <form className="card space-y-2" onSubmit={pickNewClient}>
            <p className="text-sm font-bold">عميل جديد</p>
            <input
              className="input"
              placeholder="اسم العميل"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
            />
            <input
              className="input"
              placeholder="الموبايل"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <button type="submit" className="btn btn-primary w-full">
              اختيار العميل ده
            </button>
          </form>
          <button
            type="button"
            className={`card flex w-full items-center justify-between text-right ${
              noClient ? "border-[var(--brand)]" : ""
            }`}
            onClick={pickNoClient}
          >
            <span
              className={`h-5 w-5 rounded-full border ${
                noClient ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
              }`}
            />
            <span className="font-bold">بدون عميل</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => {
              setResumeSave(false);
              setNotice("");
              setStep(resumeSave ? "budget" : "basics");
            }}
          >
            رجوع
          </button>
        </div>
      </AppShell>
    );
  }

  if (step === "status") {
    return (
      <AppShell title="حالة المشروع">
        <div className="space-y-2">
          {statuses.map((item) => (
            <button
              key={item}
              type="button"
              className="card flex w-full items-center justify-between"
              onClick={() => {
                setStatus(item);
                setStep("basics");
              }}
            >
              <span
                className={`h-5 w-5 rounded-full border ${
                  status === item ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
                }`}
              />
              <span className="font-bold">{statusLabel(item)}</span>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  if (step === "basics") {
    const client = state.clients.find((item) => item.id === clientId);
    return (
      <AppShell title="مشروع جديد">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-black">بدأت في مشروع جديد؟</h2>
          <p className="mt-1 text-sm text-stone-600">سجّل بياناته</p>
        </div>
        <div className="mb-3 flex gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-bold text-[var(--brand)]">
            الأساسيات
          </span>
          <button type="button" className="px-3 py-1 text-stone-500" onClick={() => setStep("budget")}>
            الميزانية
          </button>
        </div>
        <div className="space-y-3">
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <input
            className="input"
            placeholder="اسم المشروع"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNotice("");
            }}
          />
          <input
            className="input"
            placeholder="العنوان (اختياري)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            type="button"
            className="input text-right"
            onClick={() => {
              setAfterClient("basics");
              setNotice("");
              setStep("client");
            }}
          >
            {noClient
              ? "بدون عميل"
              : client?.name || newClient || "اختر العميل"}
          </button>
          <button type="button" className="input flex items-center justify-between" onClick={() => setStep("status")}>
            <span className="text-stone-500">حالة المشروع</span>
            <span className="font-bold">{statusLabel(status)}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => {
              if (!name.trim()) {
                setNotice("اكتب اسم المشروع");
                return;
              }
              if (!clientId && !newClient.trim() && !noClient) {
                setNotice("اختَر العميل، أو سجّل المشروع بدون عميل");
                setAfterClient("budget");
                setStep("client");
                return;
              }
              setNotice("");
              setStep("budget");
            }}
          >
            التالي
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={reset}>
            إلغاء
          </button>
        </div>
      </AppShell>
    );
  }

  if (step === "budget") {
    return (
      <AppShell title="مشروع جديد">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-black">بدأت في مشروع جديد؟</h2>
          <p className="mt-1 text-sm text-stone-600">تعاقد بالطريقة اللي تعجبك</p>
        </div>
        <div className="mb-3 flex gap-2 text-sm">
          <button type="button" className="px-3 py-1 text-stone-500" onClick={() => setStep("basics")}>
            الأساسيات
          </button>
          <span className="rounded-full bg-white px-3 py-1 font-bold text-[var(--brand)]">
            الميزانية
          </span>
        </div>
        <form onSubmit={onSave} noValidate className="space-y-3">
          <ContractBudgetFields
            contractType={contractType}
            onContractType={(type) => {
              setContractType(type);
              setNotice("");
              if (type === "percent" && !supervisionPct.trim()) {
                const amount = parseUserNumber(supervisionAmount);
                if (amount != null && amount >= 0 && amount <= 100) setSupervisionPct(String(amount));
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
            <button type="submit" className="btn btn-primary w-full">
              حفظ المشروع
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={reset}>
              إلغاء
            </button>
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
