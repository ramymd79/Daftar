"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { projectTotals, statusLabel } from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

export default function ProjectsPage() {
  const { state, addProject, addClient } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(state.clients[0]?.id || "");
  const [contractTotal, setContractTotal] = useState("");

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    let cid = clientId;
    if (!cid && clientName.trim()) {
      cid = addClient({ name: clientName });
    }
    if (!cid) return;
    const id = addProject({
      name,
      address,
      clientId: cid,
      contractTotal: Number(contractTotal) || 0,
    });
    setOpen(false);
    router.push(`/project/?id=${encodeURIComponent(id)}`);
  }

  if (open) {
    return (
      <AppShell title="مشروع جديد">
        <form onSubmit={onCreate} className="space-y-3">
          <p className="text-sm text-stone-600">
            سجّل المشروع، وبعدين تقدر تضيف الدفعات والمصروف.
          </p>
          <input
            className="input"
            placeholder="اسم المشروع"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <input
            className="input"
            placeholder="العنوان (اختياري)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <select
            className="input"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">عميل جديد</option>
            {state.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {!clientId ? (
            <input
              className="input"
              placeholder="اسم العميل الجديد"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          ) : null}
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="قيمة الاتفاق (اختياري)"
            value={contractTotal}
            onChange={(e) => setContractTotal(e.target.value)}
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ المشروع
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

  return (
    <AppShell
      title="المشاريع"
      showFab
      action={
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => setOpen(true)}
        >
          مشروع جديد
        </button>
      }
    >
      {state.projects.length === 0 ? (
        <p className="card text-stone-600">لسه مفيش مشاريع. ابدأ بأول مشروع.</p>
      ) : (
        <div className="space-y-3">
          {state.projects.map((project) => {
            const client = state.clients.find((item) => item.id === project.clientId);
            const totals = projectTotals(state, project.id);
            return (
              <Link
                key={project.id}
                href={`/project/?id=${encodeURIComponent(project.id)}`}
                className="card block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900">{project.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {client?.name || "بدون عميل"}
                      {project.address ? ` · ${project.address}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                    {statusLabel(project.status)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-stone-500">مستلم</p>
                    <p className="font-bold text-emerald-700">
                      {formatMoney(totals.received)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500">مصروف</p>
                    <p className="font-bold text-sky-700">{formatMoney(totals.spent)}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">متبقي</p>
                    <p
                      className={`font-bold ${
                        totals.remaining < 0 ? "text-rose-600" : "text-stone-800"
                      }`}
                    >
                      {formatMoney(totals.remaining)}
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
