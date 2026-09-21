"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectTabs, type ProjectTab } from "@/components/ProjectTabs";
import { SummaryCards } from "@/components/SummaryCards";
import { readCompressedImage } from "@/lib/images";
import {
  expensesByCategory,
  expensesForPerson,
  projectTotals,
  statusLabel,
} from "@/lib/logic";
import { formatDay, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";

function ProjectInner() {
  const params = useSearchParams();
  const { state, deleteTransaction, updateProject, addPhoto, updatePhotoShare, deletePhoto } =
    useStore();
  const projectId = params.get("id") || "";
  const tab = (params.get("tab") as ProjectTab) || "finance";
  const project = state.projects.find((item) => item.id === projectId);

  const totals = useMemo(
    () => (project ? projectTotals(state, project.id) : null),
    [state, project],
  );
  const byCategory = useMemo(
    () => (project ? expensesByCategory(state, project.id) : []),
    [state, project],
  );

  if (!project || !totals) {
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

  return (
    <AppShell
      title={project.name}
      action={
        <Link href={moneyHref} className="btn btn-primary text-sm">
          حركة فلوس
        </Link>
      }
    >
      <div className="mb-3 flex items-center gap-2 text-sm text-stone-600">
        <span>{client?.name || "بدون عميل"}</span>
        <span>·</span>
        <span>{statusLabel(project.status)}</span>
      </div>

      <ProjectTabs projectId={project.id} active={tab} />

      {tab === "finance" ? (
        <div className="mt-3 space-y-4">
          <SummaryCards
            received={totals.received}
            spent={totals.spent}
            remaining={totals.remaining}
            contractTotal={project.contractTotal}
          />

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">المصروف حسب الفئة</h2>
              <p className="text-sm font-bold text-[var(--brand)]">
                {formatMoney(totals.spent)}
              </p>
            </div>
            {byCategory.length === 0 ? (
              <p className="text-sm text-stone-500">لسه مفيش مصروفات.</p>
            ) : (
              <>
                <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-stone-100">
                  {byCategory.map((row) => (
                    <div
                      key={row.category.id}
                      style={{
                        width: `${row.pct}%`,
                        background: row.category.color,
                      }}
                      title={row.category.name}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {byCategory.map((row) => (
                    <li key={row.category.id} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: row.category.color }}
                          />
                          {row.category.name}
                        </span>
                        <span>
                          {row.pct.toFixed(0)}% · {formatMoney(row.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-bold">الحركات</h2>
              <Link
                href={`/print/?id=${encodeURIComponent(project.id)}`}
                className="text-sm font-semibold text-[var(--brand)]"
              >
                طباعة الكشف
              </Link>
            </div>
            {totals.txs.length === 0 ? (
              <p className="text-sm text-stone-500">
                لسه مفيش حركات. سجّل أول دفعة أو مصروف.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {totals.txs.map((tx) => {
                  const category = state.categories.find((item) => item.id === tx.categoryId);
                  const personName =
                    state.contractors.find((item) => item.id === tx.contractorId)?.name ||
                    state.suppliers.find((item) => item.id === tx.supplierId)?.name;
                  return (
                    <li key={tx.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {tx.type === "client_payment"
                              ? tx.notes || "دفعة من العميل"
                              : tx.notes || category?.name || "مصروف"}
                          </p>
                          <p className="text-stone-500">
                            {formatDay(tx.date)}
                            {tx.type === "expense" && category ? ` · ${category.name}` : ""}
                            {personName ? ` · ${personName}` : ""}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 font-bold ${
                            tx.type === "client_payment"
                              ? "text-emerald-700"
                              : "text-sky-700"
                          }`}
                        >
                          {tx.type === "client_payment" ? "+" : "−"}
                          {formatMoney(tx.amount)}
                        </p>
                      </div>
                      {tx.attachmentDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tx.attachmentDataUrl}
                          alt="مرفق الحركة"
                          className="mt-2 h-16 w-16 rounded-lg object-cover"
                        />
                      ) : null}
                      <button
                        type="button"
                        className="mt-2 text-xs text-rose-600"
                        onClick={() => {
                          if (window.confirm("تحذف الحركة دي؟")) {
                            deleteTransaction(tx.id);
                          }
                        }}
                      >
                        حذف
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "contractors" ? (
        <PeopleOnProject
          empty="لسه مفيش مقاول متربط بمصروف المشروع. اربطه لما تسجل المصروف."
          people={state.contractors
            .map((person) => ({
              ...person,
              spent: expensesForPerson(state, "contractorId", person.id, project.id).reduce(
                (sum, tx) => sum + tx.amount,
                0,
              ),
            }))
            .filter((person) => person.spent > 0)}
        />
      ) : null}

      {tab === "suppliers" ? (
        <PeopleOnProject
          empty="لسه مفيش مورد متربط بمصروف المشروع. اربطه لما تسجل المصروف."
          people={state.suppliers
            .map((person) => ({
              ...person,
              spent: expensesForPerson(state, "supplierId", person.id, project.id).reduce(
                (sum, tx) => sum + tx.amount,
                0,
              ),
            }))
            .filter((person) => person.spent > 0)}
        />
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
        <ProjectSettingsForm
          project={project}
          clients={state.clients}
          onSave={updateProject}
        />
      ) : null}
    </AppShell>
  );
}

function PeopleOnProject({
  people,
  empty,
}: {
  people: { id: string; name: string; phone?: string; spent: number }[];
  empty: string;
}) {
  if (people.length === 0) {
    return <p className="card mt-3 text-stone-500">{empty}</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {people.map((person) => (
        <div key={person.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{person.name}</p>
              {person.phone ? (
                <p className="text-sm text-stone-500" dir="ltr">
                  {person.phone}
                </p>
              ) : null}
            </div>
            <p className="font-bold text-sky-800">{formatMoney(person.spent)}</p>
          </div>
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
  photos: {
    id: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient: boolean;
  }[];
  onAdd: (input: {
    projectId: string;
    dataUrl: string;
    caption?: string;
    sharedWithClient?: boolean;
  }) => string;
  onShare: (photoId: string, sharedWithClient: boolean) => void;
  onDelete: (photoId: string) => void;
}) {
  const [draft, setDraft] = useState<{ dataUrl: string; caption: string } | null>(null);
  const [openId, setOpenId] = useState("");
  const open = photos.find((photo) => photo.id === openId);

  async function onFile(file?: File | null) {
    if (!file) return;
    const dataUrl = await readCompressedImage(file);
    setDraft({ dataUrl, caption: "" });
  }

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
              sharedWithClient: true,
            });
            setDraft(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.dataUrl}
            alt="معاينة"
            className="aspect-video w-full rounded-xl object-cover"
          />
          <input
            className="input"
            placeholder="اكتب وصف للصورة"
            value={draft.caption}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
          />
          <button type="submit" className="btn btn-primary w-full">
            حفظ في المعرض
          </button>
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() => setDraft(null)}
          >
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
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
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
              <p className="mt-2 truncate text-xs text-stone-600">
                {photo.caption || "بدون وصف"}
              </p>
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
          <img
            src={open.dataUrl}
            alt={open.caption || "صورة"}
            className="max-h-[80dvh] max-w-full rounded-xl"
          />
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
      contractTotal?: number;
    },
  ) => void;
}) {
  const [name, setName] = useState(project.name);
  const [address, setAddress] = useState(project.address || "");
  const [clientId, setClientId] = useState(project.clientId);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [contractTotal, setContractTotal] = useState(String(project.contractTotal || ""));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(project.name);
    setAddress(project.address || "");
    setClientId(project.clientId);
    setStatus(project.status);
    setContractTotal(String(project.contractTotal || ""));
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
            contractTotal: Number(contractTotal) || 0,
          });
          setSaved(true);
        }}
      >
        <p className="font-bold">بيانات المشروع</p>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="العنوان"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <select
          className="input"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
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
          <option value="active">شغال</option>
          <option value="paused">واقف</option>
          <option value="done">خلّص</option>
        </select>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="قيمة الاتفاق"
          value={contractTotal}
          onChange={(e) => setContractTotal(e.target.value)}
        />
        <button type="submit" className="btn btn-primary w-full">
          حفظ البيانات
        </button>
        {saved ? <p className="text-sm text-emerald-700">اتحفظ.</p> : null}
      </form>

      <Link
        href={`/client/?id=${encodeURIComponent(project.id)}`}
        className="btn btn-secondary w-full"
      >
        عرض العميل
      </Link>
      <Link
        href={`/print/?id=${encodeURIComponent(project.id)}`}
        className="btn btn-secondary w-full"
      >
        طباعة كشف الحساب
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
