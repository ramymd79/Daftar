"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProjectTabs, type ProjectTab } from "@/components/ProjectTabs";
import { SummaryCards } from "@/components/SummaryCards";
import {
  expensesByCategory,
  projectTotals,
  statusLabel,
} from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function ProjectInner() {
  const params = useSearchParams();
  const { state, addPhoto, updatePhotoShare } = useStore();
  const projectId = params.get("id") || "";
  const tab = (params.get("tab") as ProjectTab) || "finance";
  const project = state.projects.find((p) => p.id === projectId);

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

  const client = state.clients.find((c) => c.id === project.clientId);
  const projectContractors = state.contractors.filter((c) =>
    state.transactions.some(
      (t) =>
        t.projectId === project.id &&
        t.type === "expense" &&
        t.contractorId === c.id,
    ),
  );
  const projectSuppliers = state.suppliers.filter((s) =>
    state.transactions.some(
      (t) =>
        t.projectId === project.id &&
        t.type === "expense" &&
        t.supplierId === s.id,
    ),
  );
  const photos = state.photos.filter((p) => p.projectId === project.id);

  return (
    <AppShell
      title={project.name}
      showFab
      action={
        <Link
          href={`/money/?projectId=${encodeURIComponent(project.id)}`}
          className="btn btn-primary text-sm"
        >
          حركة فلوس
        </Link>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span>{client?.name}</span>
        <span>·</span>
        <span>{statusLabel(project.status)}</span>
        <Link
          href={`/client/?id=${encodeURIComponent(project.id)}`}
          className="ms-auto text-[var(--brand)] underline"
        >
          عرض العميل
        </Link>
      </div>

      <ProjectTabs projectId={project.id} active={tab} />

      {tab === "finance" ? (
        <div className="mt-3 space-y-4">
          <SummaryCards
            received={totals.received}
            spent={totals.spent}
            remaining={totals.remaining}
            contractTotal={project.contractTotal}
            supervisionDue={totals.supervisionDue}
            supervisionPct={project.supervisionPct}
          />

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">توزيع المصروفات</h2>
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
                          ({row.pct.toFixed(1)}%) {formatMoney(row.amount)}
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
              <h2 className="font-bold">كشف الحساب</h2>
              <Link
                href={`/print/?id=${encodeURIComponent(project.id)}`}
                className="text-sm font-semibold text-[var(--brand)]"
              >
                طباعة / PDF
              </Link>
            </div>
            <ul className="divide-y divide-stone-100">
              {totals.txs.map((tx) => {
                const cat = state.categories.find((c) => c.id === tx.categoryId);
                return (
                  <li key={tx.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {tx.type === "client_payment"
                          ? "دفعة من العميل"
                          : cat?.name || "مصروف"}
                      </p>
                      <p className="text-stone-500">
                        {new Date(tx.date).toLocaleString("ar-EG")}
                        {tx.notes ? ` · ${tx.notes}` : ""}
                      </p>
                      {tx.attachmentDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tx.attachmentDataUrl}
                          alt="مرفق"
                          className="mt-2 h-16 w-16 rounded-lg object-cover"
                        />
                      ) : null}
                    </div>
                    <p
                      className={`shrink-0 font-bold ${
                        tx.type === "client_payment"
                          ? "text-emerald-700"
                          : "text-sky-700"
                      }`}
                    >
                      {tx.type === "client_payment" ? "+" : "-"}
                      {formatMoney(tx.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "contractors" ? (
        <div className="mt-3 space-y-2">
          {projectContractors.length === 0 ? (
            <p className="card text-stone-500">
              مفيش مقاولين مرتبطين بمصروفات المشروع لسه.
            </p>
          ) : (
            projectContractors.map((c) => (
              <div key={c.id} className="card">
                <p className="font-bold">{c.name}</p>
                {c.phone ? (
                  <p className="text-sm text-stone-500">{c.phone}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "suppliers" ? (
        <div className="mt-3 space-y-2">
          {projectSuppliers.length === 0 ? (
            <p className="card text-stone-500">
              مفيش موردين مرتبطين بمصروفات المشروع لسه.
            </p>
          ) : (
            projectSuppliers.map((s) => (
              <div key={s.id} className="card">
                <p className="font-bold">{s.name}</p>
                {s.phone ? (
                  <p className="text-sm text-stone-500">{s.phone}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "gallery" ? (
        <div className="mt-3 space-y-3">
          <label className="btn btn-secondary w-full cursor-pointer">
            إضافة صورة للمعرض
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  addPhoto({
                    projectId: project.id,
                    dataUrl: String(reader.result || ""),
                    caption: file.name,
                    sharedWithClient: true,
                  });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || "صورة"}
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <p className="mt-2 truncate text-xs text-stone-600">
                  {photo.caption || "بدون عنوان"}
                </p>
                <label className="mt-1 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={photo.sharedWithClient}
                    onChange={(e) =>
                      updatePhotoShare(photo.id, e.target.checked)
                    }
                  />
                  يظهر للعميل
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="mt-3 space-y-3">
          <div className="card space-y-1 text-sm">
            <p>
              <span className="text-stone-500">قيمة الاتفاق:</span>{" "}
              {formatMoney(project.contractTotal)}
            </p>
            <p>
              <span className="text-stone-500">نسبة الإشراف:</span>{" "}
              {project.supervisionPct}%
            </p>
            <p>
              <span className="text-stone-500">العنوان:</span>{" "}
              {project.address || "—"}
            </p>
          </div>
          <Link
            href={`/client/?id=${encodeURIComponent(project.id)}`}
            className="btn btn-primary w-full"
          >
            فتح بوابة العميل (قراءة فقط)
          </Link>
          <Link
            href={`/print/?id=${encodeURIComponent(project.id)}`}
            className="btn btn-secondary w-full"
          >
            طباعة كشف الحساب
          </Link>
        </div>
      ) : null}
    </AppShell>
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
