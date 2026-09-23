"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractBudgetFields } from "@/components/ContractBudgetFields";
import { FinanceBoard } from "@/components/FinanceBoard";
import { Ledger } from "@/components/Ledger";
import { ProjectTabs, type ProjectTab } from "@/components/ProjectTabs";
import { Gallery } from "@/components/Gallery";
import { expenseBreakdown, expensesForPerson, statusLabel } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ContractType, Project, ProjectStatus } from "@/lib/types";

function ProjectInner() {
  const params = useSearchParams();
  const {
    state,
    updateProject,
    deleteProject,
    addPhoto,
    deletePhoto,
    addAlbum,
    updateAlbum,
    deleteAlbum,
    updatePhoto,
  } = useStore();
  const projectId = params.get("id") || "";
  const tab = (params.get("tab") as ProjectTab) || "finance";
  const project = state.projects.find((item) => item.id === projectId);
  const [addOpen, setAddOpen] = useState(false);

  if (!project) {
    return (
      <AppShell title="المشروع">
        <p className="card text-stone-600">المشروع مش موجود.</p>
        <Link href="/projects/" className="btn btn-secondary mt-3 inline-flex">
          رجوع للمشاريع
        </Link>
      </AppShell>
    );
  }

  const client = state.clients.find((item) => item.id === project.clientId);
  const moneyHref = `/money/?projectId=${encodeURIComponent(project.id)}`;
  const agreements = (state.agreements || []).filter((item) => item.projectId === project.id);
  const onFinance = tab === "finance";

  return (
    <AppShell
      title={project.name}
      showFab={tab !== "gallery"}
      fabHref={moneyHref}
      onFabClick={onFinance ? () => setAddOpen(true) : undefined}
    >
      <div className="mb-3 text-sm text-stone-600">
        {client?.name || "بدون عميل"} · {statusLabel(project.status)}
      </div>
      <ProjectTabs projectId={project.id} active={tab} />

      {tab === "finance" ? (
        <div className="mt-3 space-y-3">
          <FinanceBoard state={state} projectId={project.id} />
          <Ledger state={state} projectId={project.id} />
        </div>
      ) : null}

      {tab === "contractors" ? (
        <div className="mt-3 space-y-3">
          <Link
            href={`/agreement/?projectId=${encodeURIComponent(project.id)}`}
            className="card block text-center"
          >
            <p className="text-lg font-black">اتفقت مع مقاول على المشروع؟</p>
            <p className="mt-1 text-sm text-stone-600">سجّل الاتفاق ع المشروع</p>
          </Link>
          <Link
            href={`/contractor-payment/?projectId=${encodeURIComponent(project.id)}`}
            className="card block text-center"
          >
            <p className="text-lg font-black">تسجيل مدفوعات مقاول</p>
            <p className="mt-1 text-sm text-stone-600">سجل مدفوعات لمقاول مسؤول عن أعمال في المشروع</p>
          </Link>
          {agreements.length === 0 ? (
            <p className="text-sm text-stone-500">لسه مفيش اتفاقات.</p>
          ) : (
            agreements.map((agreement) => {
              const person = state.contractors.find((item) => item.id === agreement.contractorId);
              const related = expensesForPerson(
                state,
                "contractorId",
                agreement.contractorId,
                project.id,
              );
              const paid = related.reduce((sum, tx) => sum + expenseBreakdown(tx).total, 0);
              const ratio = agreement.amount > 0 ? Math.min(100, (paid / agreement.amount) * 100) : 0;
              const tags = [
                ...new Set(
                  related
                    .map((tx) => state.categories.find((item) => item.id === tx.categoryId)?.name)
                    .filter(Boolean),
                ),
              ];
              return (
                <article key={agreement.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black">{person?.name || "مقاول"}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        paid > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {paid > 0 ? "يعمل" : "بانتظار الدفع"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 text-center text-sm">
                    <div>
                      <p className="text-stone-500">المدفوع</p>
                      <p className="font-black">{formatMoney(paid)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">المتفق عليه</p>
                      <p className="font-black">{formatMoney(agreement.amount)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full bg-[var(--brand)]" style={{ width: `${ratio}%` }} />
                  </div>
                  {agreement.notes ? <p className="mt-2 text-sm text-stone-500">{agreement.notes}</p> : null}
                </article>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "suppliers" ? (
        <SupplierList projectId={project.id} />
      ) : null}

      {tab === "gallery" ? (
        <Gallery
          projectId={project.id}
          albums={(state.albums || []).filter((album) => album.projectId === project.id)}
          photos={state.photos.filter((photo) => photo.projectId === project.id)}
          onAddAlbum={addAlbum}
          onUpdateAlbum={updateAlbum}
          onDeleteAlbum={deleteAlbum}
          onAddPhoto={addPhoto}
          onUpdatePhoto={updatePhoto}
          onDeletePhoto={deletePhoto}
        />
      ) : null}

      {tab === "settings" ? (
        <ProjectSettingsForm
          project={project}
          clients={state.clients}
          onSave={updateProject}
          onDelete={deleteProject}
        />
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إغلاق"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white px-4 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200" />
            <h2 className="mb-3 text-center text-lg font-black">إضافة جديد</h2>
            <div className="space-y-2">
              <Link
                href={`/money/?projectId=${encodeURIComponent(project.id)}&kind=purchase`}
                className="card block w-full text-center text-base font-bold"
                onClick={() => setAddOpen(false)}
              >
                فاتورة مشتريات
              </Link>
              <Link
                href={`/contractor-payment/?projectId=${encodeURIComponent(project.id)}`}
                className="card block w-full text-center text-base font-bold"
                onClick={() => setAddOpen(false)}
              >
                مدفوعات لمقاول
              </Link>
              <Link
                href={`/money/?projectId=${encodeURIComponent(project.id)}&kind=payment`}
                className="card block w-full text-center text-base font-bold"
                onClick={() => setAddOpen(false)}
              >
                مدفوعات من عميل
              </Link>
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => setAddOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function SupplierList({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const people = state.suppliers
    .map((person) => {
      const txs = expensesForPerson(state, "supplierId", person.id, projectId);
      return {
        ...person,
        txs,
        spent: txs.reduce((sum, tx) => sum + expenseBreakdown(tx).total, 0),
      };
    })
    .filter((person) => person.txs.length > 0);

  if (people.length === 0) {
    return <p className="card mt-3 text-stone-500">لسه مفيش مورد متربط بمصروف المشروع.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {people.map((person) => (
        <article key={person.id} className="card">
          <div className="flex items-center justify-between">
            <p className="font-black">{person.name}</p>
            <p className="font-black text-[#b4533a]">{formatMoney(person.spent)}</p>
          </div>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {person.txs.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {tx.notes || "مصروف"}
                  <span className="block text-xs text-stone-500">{formatDay(tx.date)}</span>
                </span>
                <span className="font-bold">{formatMoney(expenseBreakdown(tx).total)}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ProjectSettingsForm({
  project,
  clients,
  onSave,
  onDelete,
}: {
  project: Project;
  clients: { id: string; name: string }[];
  onSave: (
    id: string,
    patch: {
      name?: string;
      address?: string;
      clientId?: string;
      status?: ProjectStatus;
      contractType?: ContractType;
      contractTotal?: number;
      supervisionPct?: number;
      supervisionAmount?: number | null;
      showClientPortal?: boolean;
      showClientMoney?: boolean;
      showClientGallery?: boolean;
      showClientTxNotes?: boolean;
    },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [address, setAddress] = useState(project.address || "");
  const [clientId, setClientId] = useState(project.clientId);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [contractType, setContractType] = useState<ContractType>(project.contractType || "fixed");
  const [contractTotal, setContractTotal] = useState(String(project.contractTotal || ""));
  const [supervisionPct, setSupervisionPct] = useState(String(project.supervisionPct || 0));
  const [supervisionAmount, setSupervisionAmount] = useState(
    typeof project.supervisionAmount === "number"
      ? String(project.supervisionAmount)
      : project.contractType === "fixed"
        ? String(Math.round(((project.contractTotal || 0) * (project.supervisionPct || 0)) / 100))
        : "",
  );
  const [showClientPortal, setShowClientPortal] = useState(project.showClientPortal !== false);
  const [showClientMoney, setShowClientMoney] = useState(project.showClientMoney !== false);
  const [showClientGallery, setShowClientGallery] = useState(project.showClientGallery !== false);
  const [showClientTxNotes, setShowClientTxNotes] = useState(project.showClientTxNotes === true);
  const [saved, setSaved] = useState(false);
  const clientName = clients.find((client) => client.id === clientId)?.name || "عميل";

  useEffect(() => {
    setName(project.name);
    setAddress(project.address || "");
    setClientId(project.clientId);
    setStatus(project.status);
    setContractType(project.contractType || "fixed");
    setContractTotal(String(project.contractTotal || ""));
    setSupervisionPct(String(project.supervisionPct || 0));
    setSupervisionAmount(
      typeof project.supervisionAmount === "number"
        ? String(project.supervisionAmount)
        : project.contractType === "fixed"
          ? String(Math.round(((project.contractTotal || 0) * (project.supervisionPct || 0)) / 100))
          : "",
    );
    setShowClientPortal(project.showClientPortal !== false);
    setShowClientMoney(project.showClientMoney !== false);
    setShowClientGallery(project.showClientGallery !== false);
    setShowClientTxNotes(project.showClientTxNotes === true);
  }, [project]);

  function savePortal(patch: {
    showClientPortal?: boolean;
    showClientMoney?: boolean;
    showClientGallery?: boolean;
    showClientTxNotes?: boolean;
  }) {
    onSave(project.id, patch);
  }

  return (
    <div className="mt-3 space-y-3">
      <section className="space-y-2">
        <p className="text-sm font-bold text-stone-500">إدارة المشروع</p>
        <button type="button" className="card flex w-full items-center justify-between text-right" onClick={() => setEditing(true)}>
          <span>
            <span className="block font-black">تعديل المشروع</span>
            <span className="text-xs text-stone-500">الاسم، العميل، الحالة، الميزانية</span>
          </span>
          <span aria-hidden="true">✎</span>
        </button>
        <button
          type="button"
          className="card flex w-full items-center justify-between text-right text-rose-700"
          onClick={() => {
            if (!window.confirm("تحذف المشروع؟ لا يمكن التراجع.")) return;
            onDelete(project.id);
            router.push("/projects/");
          }}
        >
          <span>
            <span className="block font-black">حذف المشروع</span>
            <span className="text-xs">لا يمكن التراجع</span>
          </span>
          <span aria-hidden="true">⌫</span>
        </button>
      </section>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">بوابة العميل</p>
            <p className="text-sm font-semibold">مقفلة لـ {clientName}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showClientPortal}
            aria-label="بوابة العميل"
            className={`relative h-7 w-12 shrink-0 rounded-full ${showClientPortal ? "bg-emerald-600" : "bg-stone-300"}`}
            onClick={() => {
              const next = !showClientPortal;
              setShowClientPortal(next);
              savePortal({ showClientPortal: next });
            }}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${showClientPortal ? "end-0.5" : "start-0.5"}`}
            />
          </button>
        </div>
        {showClientPortal ? (
          <div className="space-y-2 border-t border-stone-100 pt-3">
            <p className="text-sm font-bold">صلاحيات العرض</p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={showClientMoney}
                onChange={(e) => {
                  setShowClientMoney(e.target.checked);
                  savePortal({ showClientMoney: e.target.checked });
                }}
              />
              <span className="font-semibold">المالية</span>
            </label>
            <label className="ms-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showClientTxNotes}
                onChange={(e) => {
                  setShowClientTxNotes(e.target.checked);
                  savePortal({ showClientTxNotes: e.target.checked });
                }}
              />
              عرض الملاحظات على المعاملات
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showClientGallery}
                onChange={(e) => {
                  setShowClientGallery(e.target.checked);
                  savePortal({ showClientGallery: e.target.checked });
                }}
              />
              المعرض
            </label>
          </div>
        ) : null}
        <Link href={`/client/?id=${encodeURIComponent(project.id)}`} className="card flex items-center justify-between">
          <span>
            <span className="block font-black text-[var(--brand-dark)]">عرض كعميل</span>
            <span className="text-xs text-stone-500">معاينة المشروع كما يراه العميل — للقراءة فقط</span>
          </span>
          <span aria-hidden="true">◉</span>
        </Link>
        {showClientPortal ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="font-black text-emerald-800">الوصول نشط</p>
            <p className="text-sm text-emerald-900">يرى العميل المشروع من بوابة العميل</p>
            <button
              type="button"
              className="btn mt-2 border border-rose-200 bg-white text-rose-700"
              onClick={() => {
                setShowClientPortal(false);
                savePortal({ showClientPortal: false });
              }}
            >
              إيقاف الصلاحية
            </button>
          </div>
        ) : null}
      </section>
      {editing ? (
      <form
        className="card space-y-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!name.trim() || !clientId) return;
          onSave(project.id, {
            name,
            address,
            clientId,
            status,
            contractType,
            contractTotal: Number(contractTotal) || 0,
            supervisionPct: contractType === "percent" ? Number(supervisionPct) || 0 : 0,
            supervisionAmount: contractType === "fixed" ? Number(supervisionAmount) || 0 : null,
          });
          setSaved(true);
          setEditing(false);
        }}
      >
        <p className="font-bold">بيانات المشروع</p>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          className="input"
          placeholder="العنوان"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
        >
          <option value="not_started">لم يبدأ</option>
          <option value="active">قيد التنفيذ</option>
          <option value="paused">معلق</option>
          <option value="done">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>
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
          حفظ البيانات
        </button>
        {saved ? <p className="text-sm text-emerald-700">اتحفظ.</p> : null}
        <button type="button" className="btn btn-secondary w-full" onClick={() => setEditing(false)}>
          إلغاء
        </button>
      </form>
      ) : null}
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="المشروع">
          <p className="text-stone-500">جاري التحميل…</p>
        </AppShell>
      }
    >
      <ProjectInner />
    </Suspense>
  );
}
