"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ContractBudgetFields } from "@/components/ContractBudgetFields";
import { FinanceBoard } from "@/components/FinanceBoard";
import { Ledger } from "@/components/Ledger";
import { ProjectTabs, type ProjectTab } from "@/components/ProjectTabs";
import { readCompressedImage } from "@/lib/images";
import { expenseBreakdown, expensesForPerson, statusLabel } from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Album, ContractType, Project, ProjectStatus } from "@/lib/types";

function ProjectInner() {
  const params = useSearchParams();
  const {
    state,
    updateProject,
    addPhoto,
    deletePhoto,
    addAlbum,
    updateAlbum,
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
      showFab
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
          onAdd={addPhoto}
          onDelete={deletePhoto}
        />
      ) : null}

      {tab === "settings" ? (
        <ProjectSettingsForm
          project={project}
          clients={state.clients}
          onSave={updateProject}
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

function Gallery({
  projectId,
  albums,
  photos,
  onAddAlbum,
  onUpdateAlbum,
  onAdd,
  onDelete,
}: {
  projectId: string;
  albums: Album[];
  photos: { id: string; albumId?: string; dataUrl: string; caption?: string; createdAt: string }[];
  onAddAlbum: (input: {
    projectId: string;
    name: string;
    description?: string;
    sharedWithClient: boolean;
  }) => string;
  onUpdateAlbum: (albumId: string, patch: { sharedWithClient?: boolean }) => void;
  onAdd: (input: {
    projectId: string;
    albumId?: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  onDelete: (photoId: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shared, setShared] = useState(true);
  const [albumId, setAlbumId] = useState("");
  const [openId, setOpenId] = useState("");
  const album = albums.find((item) => item.id === albumId);
  const albumPhotos = photos.filter((photo) => photo.albumId === albumId);
  const open = albumPhotos.find((photo) => photo.id === openId);

  if (album) {
    return (
      <div className="mt-3 space-y-3">
        <button type="button" className="text-sm text-stone-500" onClick={() => setAlbumId("")}>
          رجوع للألبومات
        </button>
        <div className="card">
          <p className="font-black">{album.name}</p>
          {album.description ? <p className="mt-1 text-sm text-stone-500">{album.description}</p> : null}
          <p className="mt-1 text-xs text-stone-400">{albumPhotos.length} صور</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={album.sharedWithClient}
              onChange={(e) => onUpdateAlbum(album.id, { sharedWithClient: e.target.checked })}
            />
            مشترك مع العميل
          </label>
        </div>
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
              onAdd({
                projectId,
                albumId: album.id,
                dataUrl: await readCompressedImage(file),
                caption: album.name,
                sharedWithClient: album.sharedWithClient,
              });
            }}
          />
        </label>
        {albumPhotos.length === 0 ? (
          <p className="card text-stone-500">الألبوم فاضي.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {albumPhotos.map((photo) => (
              <button key={photo.id} type="button" className="card p-2" onClick={() => setOpenId(photo.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt={photo.caption || album.name} className="aspect-square w-full rounded-xl object-cover" />
              </button>
            ))}
          </div>
        )}
        {open ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={() => setOpenId("")}>
                ×
              </button>
              <p className="font-bold">{album.name}</p>
              <a href={open.dataUrl} download className="text-sm font-bold">
                تحميل
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.dataUrl} alt={open.caption || album.name} className="mx-auto max-h-[70dvh] max-w-full object-contain" />
            <p className="px-4 py-3 text-center text-sm text-stone-300">{formatDay(open.createdAt)}</p>
            <button
              type="button"
              className="mx-auto mb-6 text-sm text-rose-300"
              onClick={() => {
                onDelete(open.id);
                setOpenId("");
              }}
            >
              حذف
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {creating ? (
        <form
          className="card space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = onAddAlbum({
              projectId,
              name,
              description,
              sharedWithClient: shared,
            });
            setCreating(false);
            setName("");
            setDescription("");
            setShared(true);
            setAlbumId(id);
          }}
        >
          <p className="font-black">إنشاء ألبوم جديد</p>
          <label className="block text-sm font-semibold">
            اسم الألبوم <span className="text-rose-600">مطلوب</span>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            وصف <span className="font-normal text-stone-400">اختياري</span>
            <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="flex items-center justify-between text-sm font-semibold">
            مشترك مع العميل
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            إنشاء
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => setCreating(false)}>
            إلغاء
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary w-full" onClick={() => setCreating(true)}>
          ألبوم جديد
        </button>
      )}
      {albums.length === 0 ? (
        <p className="card text-stone-500">لسه مفيش ألبومات.</p>
      ) : (
        albums.map((item) => {
          const count = photos.filter((photo) => photo.albumId === item.id).length;
          const cover = photos.find((photo) => photo.albumId === item.id);
          return (
            <button key={item.id} type="button" className="card flex w-full items-center gap-3 text-right" onClick={() => setAlbumId(item.id)}>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.dataUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-xl bg-stone-100 text-xs text-stone-400">فاضي</span>
              )}
              <span>
                <span className="block font-black">{item.name}</span>
                <span className="text-sm text-stone-500">
                  {count} صور · {item.sharedWithClient ? "مشترك مع العميل" : "خاص"}
                </span>
              </span>
            </button>
          );
        })
      )}
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
      supervisionAmount?: number | null;
      showClientPortal?: boolean;
      showClientMoney?: boolean;
      showClientGallery?: boolean;
      showClientPrivatePhotos?: boolean;
      showClientTxNotes?: boolean;
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
  const [showClientPrivatePhotos, setShowClientPrivatePhotos] = useState(
    project.showClientPrivatePhotos === true,
  );
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
    setShowClientPrivatePhotos(project.showClientPrivatePhotos === true);
    setShowClientTxNotes(project.showClientTxNotes === true);
  }, [project]);

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
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">بوابة العميل</p>
            <p className="text-sm font-semibold">{clientName}</p>
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
              <span>
                <span className="block font-semibold">المالية</span>
                <span className="text-xs text-stone-500">عرض المدفوعات على المشروع</span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showClientGallery}
                onChange={(e) => {
                  const next = e.target.checked;
                  setShowClientGallery(next);
                  if (!next) setShowClientPrivatePhotos(false);
                  savePortal({
                    showClientGallery: next,
                    showClientPrivatePhotos: next ? showClientPrivatePhotos : false,
                  });
                }}
              />
              المعرض
            </label>
            {showClientGallery ? (
              <label className="ms-6 flex items-center gap-2 text-sm">
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
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={showClientTxNotes}
                onChange={(e) => {
                  setShowClientTxNotes(e.target.checked);
                  savePortal({ showClientTxNotes: e.target.checked });
                }}
              />
              <span>
                <span className="block font-semibold">عرض الملاحظات على المعاملات</span>
                <span className="text-xs text-stone-500">الملاحظات الخاصة تفضل مخفية لو المربع مقفول</span>
              </span>
            </label>
          </div>
        ) : null}
        <Link href={`/client/?id=${encodeURIComponent(project.id)}`} className="btn btn-secondary w-full">
          عرض كعميل
          <span className="mt-1 block text-xs font-normal">معاينة المشروع كما يراه العميل — للقراءة فقط</span>
        </Link>
      </section>
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
      </form>
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
