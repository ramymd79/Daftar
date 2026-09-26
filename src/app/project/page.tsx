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
import { budgetFieldError, formatDay, formatMoney, parseUserNumber } from "@/lib/money";
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
    updateAgreement,
    addAlbum,
    updateAlbum,
    deleteAlbum,
    updatePhoto,
  } = useStore();
  const projectId = params.get("id") || "";
  const tab = (params.get("tab") as ProjectTab) || "finance";
  const project = state.projects.find((item) => item.id === projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [agreementId, setAgreementId] = useState("");
  const [supplierId, setSupplierId] = useState("");

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
  const onFinance = tab === "finance";

  return (
    <AppShell
      title={project.name}
      showFab={tab !== "gallery"}
      fabHref={
        tab === "contractors"
          ? `/agreement/?projectId=${encodeURIComponent(project.id)}`
          : tab === "suppliers"
            ? `/money/?projectId=${encodeURIComponent(project.id)}&kind=purchase`
            : moneyHref
      }
      fabLabel={tab === "contractors" ? "إضافة مقاول" : tab === "suppliers" ? "تسجيل شراء" : "تسجيل حركة فلوس"}
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
        <ContractorTab
          projectId={project.id}
          projectName={project.name}
          selectedId={agreementId}
          onSelect={setAgreementId}
          onSaveAgreement={(id, amount, notes) => updateAgreement(id, { amount, notes })}
        />
      ) : null}

      {tab === "suppliers" ? (
        <SupplierList projectId={project.id} selectedId={supplierId} onSelect={setSupplierId} />
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

function purchaseCountLabel(count: number) {
  if (count === 1) return "عملية شراء واحدة";
  return `${count.toLocaleString("ar-EG")} عمليات شراء`;
}

function ContractorTab({
  projectId,
  projectName,
  selectedId,
  onSelect,
  onSaveAgreement,
}: {
  projectId: string;
  projectName: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onSaveAgreement: (id: string, amount: number, notes: string) => void;
}) {
  const { state } = useStore();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const agreements = (state.agreements || []).filter((item) => item.projectId === projectId);
  const selected = agreements.find((item) => item.id === selectedId);

  if (selected) {
    const person = state.contractors.find((item) => item.id === selected.contractorId);
    const related = expensesForPerson(state, "contractorId", selected.contractorId, projectId);
    const paid = related.reduce((sum, tx) => sum + expenseBreakdown(tx).total, 0);
    const tags = [
      ...new Set([
        ...(person?.specialties || []),
        ...related.map((tx) => state.categories.find((item) => item.id === tx.categoryId)?.name).filter(Boolean),
      ]),
    ] as string[];
    if (editing) {
      return (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSaveAgreement(selected.id, parseUserNumber(amount) || 0, notes);
            setEditing(false);
          }}
        >
          <h2 className="text-center text-lg font-black">تعديل التعاقد</h2>
          <label className="block text-sm font-semibold">
            المقاول
            <input className="input mt-1" value={person?.name || ""} disabled />
          </label>
          <label className="block text-sm font-semibold">
            المشروع
            <input className="input mt-1" value="المشروع" disabled />
          </label>
          <label className="block text-sm font-semibold">
            المبلغ المتفق عليه <span className="font-normal text-stone-400">اختياري</span>
            <input className="input mt-1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            ملاحظات <span className="font-normal text-stone-400">اختياري</span>
            <textarea className="input mt-1 min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary w-full">حفظ التعديلات</button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setEditing(false)}>إلغاء</button>
        </form>
      );
    }
    return (
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" className="text-sm font-bold text-stone-500" onClick={() => onSelect("")}>رجوع</button>
          <p className="font-black">تفاصيل التعاقد</p>
          <button
            type="button"
            className="text-sm font-bold text-[var(--brand)]"
            onClick={() => {
              setAmount(selected.amount ? String(selected.amount) : "");
              setNotes(selected.notes || "");
              setEditing(true);
            }}
          >
            تعديل
          </button>
        </div>
        <div className="card">
          <p className="font-black">{person?.name || "مقاول"}</p>
          <p className="mt-1 text-sm text-stone-500">{paid < selected.amount ? "بانتظار الدفع" : statusLabel("active")}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{tag}</span>
            ))}
          </div>
          <Link href={`/contractors/?id=${encodeURIComponent(selected.contractorId)}`} className="mt-3 block text-sm font-bold text-[var(--brand)]">
            عرض ملف المقاول الكامل
          </Link>
        </div>
        <div className="card space-y-2">
          <p className="font-black">ملخص التعاقد والمدفوعات</p>
          <p className="flex justify-between text-sm"><span>المتفق عليه</span><span className="font-black">{formatMoney(selected.amount)}</span></p>
          <p className="flex justify-between text-sm"><span>المستلم</span><span className="font-black">{formatMoney(paid)}</span></p>
          <p className="flex justify-between text-sm"><span>المتبقي</span><span className="font-black">{formatMoney(Math.max(0, selected.amount - paid))}</span></p>
        </div>
        <div className="card text-sm">
          <p className="font-bold">{projectName}</p>
          <p className="mt-1 text-stone-500">{formatDay(selected.createdAt)}</p>
          {selected.notes ? <p className="mt-2">{selected.notes}</p> : <p className="mt-2 text-stone-400">مفيش ملاحظات على التعاقد</p>}
        </div>
        <p className="font-black">سجل المدفوعات في هذا المشروع</p>
        {related.length === 0 ? <p className="text-sm text-stone-500">لسه مفيش دفعات.</p> : related.map((tx) => (
          <p key={tx.id} className="card flex justify-between text-sm">
            <span>{formatDay(tx.date)}</span>
            <span className="font-black">{formatMoney(expenseBreakdown(tx).total)}</span>
          </p>
        ))}
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <div className="card mt-3 py-10 text-center">
        <p className="text-lg font-black">لا يوجد مقاولون في هذا المشروع</p>
        <Link href={`/agreement/?projectId=${encodeURIComponent(projectId)}`} className="btn btn-primary mt-4 inline-flex">
          إضافة مقاول جديد
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {agreements.map((agreement) => {
        const person = state.contractors.find((item) => item.id === agreement.contractorId);
        const related = expensesForPerson(state, "contractorId", agreement.contractorId, projectId);
        const paid = related.reduce((sum, tx) => sum + expenseBreakdown(tx).total, 0);
        const ratio = agreement.amount > 0 ? Math.min(100, (paid / agreement.amount) * 100) : 0;
        const tags = [
          ...new Set([
            ...(person?.specialties || []),
            ...related.map((tx) => state.categories.find((item) => item.id === tx.categoryId)?.name).filter(Boolean),
          ]),
        ] as string[];
        const waiting = agreement.amount > 0 ? paid < agreement.amount : paid === 0;
        return (
          <button key={agreement.id} type="button" className="card w-full text-right" onClick={() => onSelect(agreement.id)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black">{person?.name || "مقاول"}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{tag}</span>
                  ))}
                </div>
              </div>
              {waiting ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">بانتظار الدفع</span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 text-center text-sm">
              <div>
                <p className="text-stone-500">المدفوع</p>
                <p className="font-black">{paid === 0 ? "·" : formatMoney(paid)}</p>
              </div>
              <div>
                <p className="text-stone-500">المتفق عليه</p>
                <p className="font-black">{agreement.amount === 0 ? "·" : formatMoney(agreement.amount)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full bg-[var(--brand)]" style={{ width: `${ratio}%` }} />
            </div>
          </button>
        );
      })}
      <p className="pt-2 text-center text-xs text-stone-400">نهاية القائمة</p>
      <p className="text-center text-xs text-stone-400">اطلعت على الكل</p>
    </div>
  );
}

function SupplierList({
  projectId,
  selectedId,
  onSelect,
}: {
  projectId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
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
  const selected = people.find((person) => person.id === selectedId);

  if (selected) {
    const digits = (selected.phone || "").replace(/\D/g, "");
    return (
      <div className="mt-3 space-y-3">
        <button type="button" className="text-sm font-bold text-stone-500" onClick={() => onSelect("")}>رجوع</button>
        <div className="card">
          <p className="text-lg font-black">{selected.name}</p>
          <Link href={`/suppliers/?id=${encodeURIComponent(selected.id)}`} className="mt-2 block text-sm font-bold text-[var(--brand)]">
            عرض الملف الكامل للمورد
          </Link>
          {selected.phone ? (
            <div className="mt-3 flex gap-2">
              <a className="btn btn-secondary flex-1 text-center" href={`tel:${selected.phone}`}>اتصال</a>
              {digits ? (
                <a className="btn btn-secondary flex-1 text-center" href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">واتساب</a>
              ) : null}
            </div>
          ) : null}
          {selected.notes ? <p className="mt-3 text-sm">{selected.notes}</p> : null}
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">الإنفاق في المشروع</p>
          <p className="text-lg font-black text-[#b4533a]">{formatMoney(selected.spent)}</p>
        </div>
        <p className="font-black">المشتريات في هذا المشروع</p>
        <p className="text-sm text-stone-500">{purchaseCountLabel(selected.txs.length)}</p>
        {selected.txs.map((tx) => (
          <p key={tx.id} className="card flex justify-between text-sm">
            <span>
              {tx.notes || "شراء مواد"}
              <span className="block text-xs text-stone-500">{formatDay(tx.date)}</span>
            </span>
            <span className="font-black">{formatMoney(expenseBreakdown(tx).total)}</span>
          </p>
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return <p className="card mt-3 text-stone-500">لسه مفيش مورد متربط بمصروف المشروع.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {people.map((person) => (
        <button key={person.id} type="button" className="card w-full text-right" onClick={() => onSelect(person.id)}>
          <div className="flex items-center justify-between">
            <p className="font-black">{person.name}</p>
            <p className="font-black text-[#b4533a]">{formatMoney(person.spent)}</p>
          </div>
          <p className="mt-1 text-sm text-stone-500">{purchaseCountLabel(person.txs.length)}</p>
        </button>
      ))}
      <p className="pt-2 text-center text-xs text-stone-400">نهاية القائمة</p>
      <p className="text-center text-xs text-stone-400">اطلعت على الكل</p>
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
  clients: { id: string; name: string; email?: string }[];
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
      showClientPrivatePhotos?: boolean;
      showClientTxNotes?: boolean;
    },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const { updatePerson } = useStore();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
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
  const [showClientPrivatePhotos, setShowClientPrivatePhotos] = useState(project.showClientPrivatePhotos === true);
  const [showClientTxNotes, setShowClientTxNotes] = useState(project.showClientTxNotes === true);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const client = clients.find((item) => item.id === clientId);
  const clientName = client?.name || (clientId ? "عميل" : "بدون عميل");
  const clientHasEmail = Boolean(client?.email?.trim());

  useEffect(() => {
    if (editing) return;
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
    setShowClientPrivatePhotos(project.showClientPrivatePhotos === true);
    setShowClientTxNotes(project.showClientTxNotes === true);
  }, [project, editing]);

  function savePortal(patch: {
    showClientPortal?: boolean;
    showClientMoney?: boolean;
    showClientGallery?: boolean;
    showClientPrivatePhotos?: boolean;
    showClientTxNotes?: boolean;
  }) {
    onSave(project.id, patch);
  }

  return (
    <div className="mt-3 space-y-3">
      <section className="space-y-2">
        <p className="text-sm font-bold text-stone-500">إدارة المشروع</p>
        <button type="button" className="card flex w-full items-center justify-between text-right" onClick={() => { setSaved(false); setNotice(""); setEditing(true); }}>
          <span>
            <span className="block font-black">تعديل المشروع</span>
            <span className="text-xs text-stone-500">الاسم، العميل، الحالة، الميزانية</span>
          </span>
          <span aria-hidden="true">✎</span>
        </button>
        <button
          type="button"
          className="card flex w-full items-center justify-between text-right text-rose-700"
          onClick={() => setDeleteOpen(true)}
        >
          <span>
            <span className="block font-black">حذف المشروع</span>
            <span className="text-xs">لا يمكن التراجع</span>
          </span>
          <span aria-hidden="true">⌫</span>
        </button>
        {saved && !editing ? <p className="text-sm font-bold text-emerald-700">اتحفظ.</p> : null}
      </section>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">بوابة العميل</p>
            <p className="text-sm font-semibold">
              {showClientPortal ? `مفعّلة لـ ${clientName}` : `مقفلة لـ ${clientName}`}
            </p>
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
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-right ${
                showClientMoney ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"
              }`}
              onClick={() => {
                const next = !showClientMoney;
                setShowClientMoney(next);
                savePortal({ showClientMoney: next });
              }}
            >
              <span className="font-bold">المالية</span>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] text-white ${
                  showClientMoney ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
                }`}
              >
                {showClientMoney ? "✓" : ""}
              </span>
            </button>
            {showClientMoney ? (
              <label className="ms-2 flex items-center gap-2 text-sm">
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
            ) : null}
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-right ${
                showClientGallery ? "border-[var(--brand)] bg-[#f3e6dc]" : "border-stone-200 bg-white"
              }`}
              onClick={() => {
                const next = !showClientGallery;
                setShowClientGallery(next);
                savePortal({ showClientGallery: next });
              }}
            >
              <span className="font-bold">المعرض</span>
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] text-white ${
                  showClientGallery ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
                }`}
              >
                {showClientGallery ? "✓" : ""}
              </span>
            </button>
            {showClientGallery ? (
              <label className="ms-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showClientPrivatePhotos}
                  onChange={(e) => {
                    setShowClientPrivatePhotos(e.target.checked);
                    savePortal({ showClientPrivatePhotos: e.target.checked });
                  }}
                />
                عرض الصور الخاصة
              </label>
            ) : null}
          </div>
        ) : null}
        <Link href={`/client/?id=${encodeURIComponent(project.id)}`} className="card flex items-center justify-between">
          <span>
            <span className="block font-black text-[var(--brand-dark)]">عرض كعميل</span>
            <span className="text-xs text-stone-500">معاينة المشروع كما يراه العميل — للقراءة فقط</span>
          </span>
          <span aria-hidden="true">◉</span>
        </Link>
        {showClientPortal && clientId && !clientHasEmail ? (
          <button
            type="button"
            className="card w-full text-right"
            onClick={() => {
              setClientEmail("");
              setEmailOpen(true);
            }}
          >
            <span className="block font-black">أضف بريد العميل</span>
            <span className="mt-1 block text-sm text-stone-500">الدعوة تحتاج بريدًا – لا يملك العميل واحدًا</span>
          </button>
        ) : null}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-100 px-3 py-3 text-center"
        >
          <span className="block font-black text-stone-500">إرسال دعوة للعميل على إميله</span>
          <span className="mt-1 block text-xs font-normal text-stone-500">لسه مش شغالة</span>
        </button>
      </section>
      {emailOpen && clientId ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4">
            <p className="font-black">أضف بريد العميل</p>
            <p className="text-sm text-stone-600">الدعوة تحتاج بريدًا – لا يملك العميل واحدًا</p>
            <input
              className="input"
              dir="ltr"
              inputMode="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                if (!clientEmail.trim() || !client) return;
                updatePerson("clients", clientId, {
                  name: client.name,
                  email: clientEmail.trim(),
                });
                setEmailOpen(false);
              }}
            >
              حفظ البريد
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={() => setEmailOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
      {deleteOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4">
            <p className="font-black">حذف المشروع</p>
            <p className="text-sm text-stone-600">هل أنت متأكد من حذف مشروع «{project.name}»؟</p>
            <p className="text-sm font-bold text-rose-700">لا يمكن التراجع عن هذا الإجراء.</p>
            <button
              type="button"
              className="btn w-full bg-rose-700 text-white"
              onClick={() => {
                onDelete(project.id);
                router.push("/projects/");
              }}
            >
              حذف
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
      {editing ? (
      <form
        className="card space-y-3"
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!name.trim()) {
            setNotice("اكتب اسم المشروع");
            return;
          }
          const problem = budgetFieldError({
            contractType,
            contractTotal,
            supervisionPct,
            supervisionAmount,
          });
          if (problem) {
            setNotice(problem);
            return;
          }
          onSave(project.id, {
            name,
            address,
            clientId,
            status,
            contractType,
            contractTotal: parseUserNumber(contractTotal) || 0,
            supervisionPct: contractType === "percent" ? parseUserNumber(supervisionPct) || 0 : 0,
            supervisionAmount: contractType === "fixed" ? parseUserNumber(supervisionAmount) || 0 : null,
          });
          setNotice("");
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
          <option value="">بدون عميل</option>
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
          onContractTotal={setContractTotal}
          supervisionPct={supervisionPct}
          onSupervisionPct={setSupervisionPct}
          supervisionAmount={supervisionAmount}
          onSupervisionAmount={setSupervisionAmount}
        />
        <div className="sticky bottom-24 z-30 space-y-2 bg-[var(--bg)] py-3">
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <button type="submit" className="btn btn-primary w-full">
            حفظ البيانات
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => { setNotice(""); setEditing(false); }}>
            إلغاء
          </button>
        </div>
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
