"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FinanceBoard } from "@/components/FinanceBoard";
import { ProjectTabs, type ProjectTab } from "@/components/ProjectTabs";
import { readCompressedImage } from "@/lib/images";
import {
  contractTypeLabel,
  expensesForPerson,
  statusLabel,
} from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ContractType, Project, ProjectStatus } from "@/lib/types";

function ProjectInner() {
  const params = useSearchParams();
  const {
    state,
    updateProject,
    addPhoto,
    updatePhotoShare,
    deletePhoto,
  } = useStore();
  const projectId = params.get("id") || "";
  const tab = (params.get("tab") as ProjectTab) || "finance";
  const project = state.projects.find((item) => item.id === projectId);

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

  return (
    <AppShell title={project.name} showFab fabHref={moneyHref}>
      <div className="mb-3 text-sm text-stone-600">
        {client?.name || "بدون عميل"} · {statusLabel(project.status)}
      </div>
      <ProjectTabs projectId={project.id} active={tab} />

      {tab === "finance" ? (
        <div className="mt-3">
          <FinanceBoard state={state} projectId={project.id} />
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
          {agreements.length === 0 ? (
            <p className="text-sm text-stone-500">لسه مفيش اتفاقات.</p>
          ) : (
            agreements.map((agreement) => {
              const person = state.contractors.find((item) => item.id === agreement.contractorId);
              const paid = expensesForPerson(
                state,
                "contractorId",
                agreement.contractorId,
                project.id,
              ).reduce((sum, tx) => sum + tx.amount, 0);
              return (
                <div key={agreement.id} className="card">
                  <p className="font-bold">{person?.name || "مقاول"}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    المتفق عليه {formatMoney(agreement.amount)} · اتدفع {formatMoney(paid)}
                  </p>
                  {agreement.notes ? (
                    <p className="mt-1 text-sm text-stone-500">{agreement.notes}</p>
                  ) : null}
                </div>
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
          photos={state.photos.filter((photo) => photo.projectId === project.id)}
          onAdd={addPhoto}
          onShare={updatePhotoShare}
          onDelete={deletePhoto}
        />
      ) : null}

      {tab === "settings" ? (
        <ProjectSettingsForm project={project} clients={state.clients} onSave={updateProject} />
      ) : null}
    </AppShell>
  );
}

function SupplierList({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const people = state.suppliers
    .map((person) => ({
      ...person,
      spent: expensesForPerson(state, "supplierId", person.id, projectId).reduce(
        (sum, tx) => sum + tx.amount,
        0,
      ),
    }))
    .filter((person) => person.spent > 0);

  if (people.length === 0) {
    return <p className="card mt-3 text-stone-500">لسه مفيش مورد متربط بمصروف المشروع.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {people.map((person) => (
        <div key={person.id} className="card flex items-center justify-between">
          <p className="font-bold">{person.name}</p>
          <p className="font-bold text-[#b4533a]">{formatMoney(person.spent)}</p>
        </div>
      ))}
    </div>
  );
}

function Gallery({
  projectId,
  photos,
  onAdd,
  onShare,
  onDelete,
}: {
  projectId: string;
  photos: { id: string; dataUrl: string; caption?: string; sharedWithClient: boolean }[];
  onAdd: (input: {
    projectId: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  onShare: (photoId: string, shared: boolean) => void;
  onDelete: (photoId: string) => void;
}) {
  const [draft, setDraft] = useState<{ dataUrl: string; caption: string; shared: boolean } | null>(
    null,
  );
  const [openId, setOpenId] = useState("");
  const open = photos.find((photo) => photo.id === openId);

  return (
    <div className="mt-3 space-y-3">
      {draft ? (
        <form
          className="card space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onAdd({
              projectId,
              dataUrl: draft.dataUrl,
              caption: draft.caption.trim() || "صورة من الموقع",
              sharedWithClient: draft.shared,
            });
            setDraft(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.dataUrl} alt="معاينة" className="aspect-video w-full rounded-xl object-cover" />
          <input
            className="input"
            placeholder="وصف الصورة"
            value={draft.caption}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.shared}
              onChange={(e) => setDraft({ ...draft, shared: e.target.checked })}
            />
            تظهر للعميل
          </label>
          <button type="submit" className="btn btn-primary w-full">
            حفظ في المعرض
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setDraft(null)}>
            إلغاء
          </button>
        </form>
      ) : (
        <label className="btn btn-secondary w-full cursor-pointer">
          إضافة صورة
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setDraft({
                dataUrl: await readCompressedImage(file),
                caption: "",
                shared: true,
              });
            }}
          />
        </label>
      )}

      {photos.length === 0 && !draft ? (
        <p className="card text-stone-500">لسه مفيش صور للموقع.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="card p-2">
              <button type="button" className="block w-full" onClick={() => setOpenId(photo.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || "صورة"}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              </button>
              <p className="mt-2 truncate text-xs">{photo.caption || "بدون وصف"}</p>
              <label className="mt-1 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={photo.sharedWithClient}
                  onChange={(e) => onShare(photo.id, e.target.checked)}
                />
                تظهر للعميل
              </label>
              <button
                type="button"
                className="mt-1 text-xs text-rose-600"
                onClick={() => {
                  if (window.confirm("تحذف الصورة دي؟")) onDelete(photo.id);
                }}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenId("")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.dataUrl} alt={open.caption || "صورة"} className="max-h-[80dvh] max-w-full rounded-xl" />
        </button>
      ) : null}
    </div>
  );
}

function ProjectSettingsForm({
  project,
  clients,
  onSave,
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
    },
  ) => void;
}) {
  const [name, setName] = useState(project.name);
  const [address, setAddress] = useState(project.address || "");
  const [clientId, setClientId] = useState(project.clientId);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [contractType, setContractType] = useState<ContractType>(project.contractType || "fixed");
  const [contractTotal, setContractTotal] = useState(String(project.contractTotal || ""));
  const [supervisionPct, setSupervisionPct] = useState(String(project.supervisionPct || 0));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(project.name);
    setAddress(project.address || "");
    setClientId(project.clientId);
    setStatus(project.status);
    setContractType(project.contractType || "fixed");
    setContractTotal(String(project.contractTotal || ""));
    setSupervisionPct(String(project.supervisionPct || 0));
  }, [project]);

  return (
    <div className="mt-3 space-y-3">
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
            supervisionPct: Number(supervisionPct) || 0,
          });
          setSaved(true);
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
        <select
          className="input"
          value={contractType}
          onChange={(e) => setContractType(e.target.value as ContractType)}
        >
          <option value="contract">{contractTypeLabel("contract")}</option>
          <option value="fixed">{contractTypeLabel("fixed")}</option>
          <option value="percent">{contractTypeLabel("percent")}</option>
        </select>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="الميزانية الإجمالية"
          value={contractTotal}
          onChange={(e) => setContractTotal(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder="نسبة الإشراف"
          value={supervisionPct}
          onChange={(e) => setSupervisionPct(e.target.value)}
        />
        <button type="submit" className="btn btn-primary w-full">
          حفظ البيانات
        </button>
        {saved ? <p className="text-sm text-emerald-700">اتحفظ.</p> : null}
      </form>
      <Link href={`/client/?id=${encodeURIComponent(project.id)}`} className="btn btn-secondary w-full">
        شوف هيشوف العميل إيه
      </Link>
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
