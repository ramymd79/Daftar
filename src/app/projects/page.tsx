"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractBudgetFields } from "@/components/ContractBudgetFields";
import { projectMoney, statusLabel } from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ContractType, ProjectStatus } from "@/lib/types";

type Step = "list" | "basics" | "client" | "status" | "budget";

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
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    let cid = clientId;
    if (!cid && newClient.trim()) {
      cid = addClient({ name: newClient, phone: newPhone });
    }
    if (!cid && !noClient) {
      setStep("client");
      return;
    }
    const id = addProject({
      name,
      address,
      clientId: cid || "",
      status,
      contractType,
      contractTotal: Number(contractTotal) || 0,
      supervisionPct: contractType === "percent" ? Number(supervisionPct) || 0 : 0,
      supervisionAmount: contractType === "fixed" ? Number(supervisionAmount) || 0 : null,
    });
    reset();
    router.push(`/project/?id=${encodeURIComponent(id)}`);
  }

  if (step === "client") {
    return (
      <AppShell title="اختر العميل">
        <div className="space-y-2">
          {state.clients.map((client) => (
            <button
              key={client.id}
              type="button"
              className={`card flex w-full items-center justify-between text-right ${
                clientId === client.id ? "border-[var(--brand)]" : ""
              }`}
              onClick={() => {
                setClientId(client.id);
                setNewClient("");
                setNoClient(false);
                setStep("basics");
              }}
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
          <form
            className="card space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newClient.trim()) return;
              setClientId("");
              setNoClient(false);
              setStep("basics");
            }}
          >
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
            onClick={() => {
              setClientId("");
              setNewClient("");
              setNewPhone("");
              setNoClient(true);
              setStep("basics");
            }}
          >
            <span
              className={`h-5 w-5 rounded-full border ${
                noClient ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
              }`}
            />
            <span className="font-bold">بدون عميل</span>
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setStep("basics")}>
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
          <input
            className="input"
            placeholder="اسم المشروع"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="العنوان (اختياري)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button type="button" className="input text-right" onClick={() => setStep("client")}>
            {noClient
              ? "بدون عميل"
              : client?.name || newClient || "اختر العميل"}
          </button>
          <button type="button" className="input flex items-center justify-between" onClick={() => setStep("status")}>
            <span className="text-stone-500">حالة المشروع</span>
            <span className="font-bold">{statusLabel(status)}</span>
          </button>
          <button type="button" className="btn btn-primary w-full" onClick={() => setStep("budget")}>
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
        <form onSubmit={onSave} className="space-y-3">
          <ContractBudgetFields
            contractType={contractType}
            onContractType={(type) => {
              setContractType(type);
              if (type === "fixed" && !supervisionAmount) {
                const total = Number(contractTotal) || 0;
                const pct = Number(supervisionPct) || 0;
                if (total > 0 && pct > 0) setSupervisionAmount(String(Math.round((total * pct) / 100)));
              }
            }}
            contractTotal={contractTotal}
            onContractTotal={setContractTotal}
            supervisionPct={supervisionPct}
            onSupervisionPct={setSupervisionPct}
            supervisionAmount={supervisionAmount}
            onSupervisionAmount={setSupervisionAmount}
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ المشروع
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={reset}>
            إلغاء
          </button>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="المشاريع"
      showFab
      action={
        <button type="button" className="btn btn-primary text-sm" onClick={() => setStep("basics")}>
          مشروع جديد
        </button>
      }
    >
      {state.projects.length === 0 ? (
        <div className="card text-center">
          <p className="text-lg font-black">بدأت في مشروع جديد؟</p>
          <p className="mt-1 text-sm text-stone-600">سجّل بياناته</p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.projects.map((project) => {
            const client = state.clients.find((item) => item.id === project.clientId);
            const money = projectMoney(state, project.id);
            return (
              <Link
                key={project.id}
                href={`/project/?id=${encodeURIComponent(project.id)}`}
                className="card block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{project.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {client?.name || "بدون عميل"}
                      {project.address ? ` · ${project.address}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs">
                    {statusLabel(project.status)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xs text-stone-500">مستلم</p>
                    <p className="text-lg font-black">{formatMoney(money.received)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">مصروف</p>
                    <p className="text-lg font-black text-[#b4533a]">
                      {formatMoney(money.spent)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
