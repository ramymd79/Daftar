"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ledger } from "@/components/Ledger";
import { expensesByCategory, projectMoney, statusLabel, supervisionDueLabel } from "@/lib/logic";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Album, GalleryPhoto } from "@/lib/types";

function ClientInner() {
  const params = useSearchParams();
  const { state } = useStore();
  const projectId = params.get("id") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const [tab, setTab] = useState<"finance" | "photos">("finance");

  if (!project) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="card">المشروع مش متاح.</p>
      </div>
    );
  }

  const client = state.clients.find((item) => item.id === project.clientId);
  const money = projectMoney(state, project.id);
  const rows = expensesByCategory(state, project.id);
  const portalOpen = project.showClientPortal !== false;
  const showMoney = portalOpen && project.showClientMoney !== false;
  const showGallery = portalOpen && project.showClientGallery !== false;
  const sharedAlbums = (state.albums || []).filter(
    (album) => album.projectId === project.id && album.sharedWithClient,
  );

  useEffect(() => {
    if (tab === "finance" && !showMoney && showGallery) setTab("photos");
    if (tab === "photos" && !showGallery && showMoney) setTab("finance");
  }, [showMoney, showGallery, tab]);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] pb-24">
      <div className="bg-emerald-800 px-4 py-3 text-sm text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">تشاهد كعميل: {client?.name || "عميل"}</p>
            <p className="mt-1 text-emerald-50">وضع للقراءة فقط. لا يمكن التعديل.</p>
          </div>
          <Link href={`/project/?id=${encodeURIComponent(project.id)}`} className="shrink-0 font-bold underline">
            خروج
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs text-stone-500">مرحبًا</p>
        <h1 className="text-xl font-black">{project.name}</h1>
        <p className="text-sm text-stone-500">{statusLabel(project.status)}</p>

        {!portalOpen ? (
          <p className="card mt-3 text-stone-500">بوابة العميل مقفولة على المشروع ده.</p>
        ) : null}

        {portalOpen && !showMoney && !showGallery ? (
          <p className="card mt-3 text-stone-500">مفيش حاجة ظاهرة للعميل على المشروع ده.</p>
        ) : null}

        {showMoney && tab === "finance" ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <PortalCard
                label="المستلم (شامل الإشراف)"
                hint={project.contractTotal ? `من أصل ${formatMoney(project.contractTotal)}` : undefined}
                value={formatMoney(money.received)}
              />
              <PortalCard
                label="المتبقي بعد المصروف والإشراف"
                value={formatMoney(money.remaining)}
                danger={money.remaining < 0}
              />
              <PortalCard label="المصروف" value={formatMoney(money.spent)} danger />
              <PortalCard
                label={supervisionDueLabel(project)}
                value={formatMoney(money.supervisionDue)}
                danger
              />
            </div>

            {money.uncovered > 0 ? (
              <div className="rounded-2xl bg-rose-100 px-4 py-3 text-center text-sm font-bold text-rose-800">
                مصروفات غير مغطاة بمبلغ {formatMoney(money.uncovered)}
              </div>
            ) : null}

            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black">توزيع المصروفات</h2>
                <p className="font-black">{formatMoney(money.spent)}</p>
              </div>
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.category.id}>
                    <div className="mb-1 flex justify-between text-sm font-bold">
                      <span>{row.category.name}</span>
                      <span>
                        ({row.pct.toFixed(0)}%) {formatMoney(row.amount)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 text-center text-xs text-stone-600">
                      <span>مشتريات {formatMoney(row.purchase)}</span>
                      <span>نقل وتشوين {formatMoney(row.transport)}</span>
                      <span>مقاولين {formatMoney(row.labor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Ledger
              state={state}
              projectId={project.id}
              heading="سجل المدفوعات"
              allowNotes={project.showClientTxNotes === true}
            />
          </div>
        ) : showGallery && tab === "photos" ? (
          <ClientAlbums
            albums={sharedAlbums}
            photos={state.photos}
            showPrivate={project.showClientPrivatePhotos === true}
          />
        ) : null}
      </div>

      {portalOpen && (showMoney || showGallery) ? (
        <div className={`fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-lg border-t border-stone-200 bg-white text-center ${showMoney && showGallery ? "grid-cols-2" : "grid-cols-1"}`}>
          {showMoney ? (
            <button type="button" className={`px-3 py-3 text-sm font-bold ${tab === "finance" ? "text-[var(--brand)]" : "text-stone-500"}`} onClick={() => setTab("finance")}>
              المالية
            </button>
          ) : null}
          {showGallery ? (
            <button type="button" className={`px-3 py-3 text-sm font-bold ${tab === "photos" ? "text-[var(--brand)]" : "text-stone-500"}`} onClick={() => setTab("photos")}>
              الصور
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClientAlbums({
  albums,
  photos,
  showPrivate,
}: {
  albums: Album[];
  photos: GalleryPhoto[];
  showPrivate: boolean;
}) {
  const [albumId, setAlbumId] = useState("");
  const album = albums.find((item) => item.id === albumId);
  const visible = (photo: GalleryPhoto) => showPrivate || !photo.hiddenFromClient;
  const rows = photos.filter((photo) => photo.albumId === albumId && visible(photo));
  if (album) {
    return (
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2">
          <button type="button" className="text-sm font-bold text-stone-500" onClick={() => setAlbumId("")}>
            رجوع
          </button>
          <p className="min-w-0 flex-1 truncate text-center font-black">{album.name}</p>
        </div>
        {rows.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-lg font-black">لا توجد صور في هذا الألبوم</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {rows.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-2xl bg-white">
                {photo.dataUrl.startsWith("data:application/pdf") ? (
                  <span className="grid aspect-square place-items-center text-sm font-bold">PDF</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.dataUrl} alt={photo.caption || album.name} className="aspect-square w-full object-cover" />
                )}
                {photo.caption ? <p className="truncate px-2 py-1 text-xs">{photo.caption}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (albums.length === 0) {
    return <p className="card mt-3 text-stone-500">مفيش صور ظاهرة للعميل.</p>;
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {albums.map((item) => {
        const albumPhotos = photos.filter((photo) => photo.albumId === item.id && visible(photo));
        const cover = albumPhotos.find((photo) => photo.id === item.coverPhotoId) || albumPhotos[0];
        return (
          <button key={item.id} type="button" className="text-right" onClick={() => setAlbumId(item.id)}>
            <div className="relative overflow-hidden rounded-2xl bg-emerald-50">
              {cover && !cover.dataUrl.startsWith("data:application/pdf") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.dataUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <span className="grid aspect-square place-items-center text-3xl text-emerald-700/40">▦</span>
              )}
              <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                {albumPhotos.length.toLocaleString("ar-EG")}
              </span>
            </div>
            <p className="mt-2 truncate font-black">{item.name}</p>
          </button>
        );
      })}
    </div>
  );
}

function PortalCard({
  label,
  hint,
  value,
  danger,
}: {
  label: string;
  hint?: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="text-xs text-stone-500">{label}</p>
      {hint ? <p className="text-[10px] text-stone-400">{hint}</p> : null}
      <p className={`mt-1 text-lg font-black ${danger ? "text-rose-700" : ""}`}>{value}</p>
    </div>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div className="p-6">جاري التحميل…</div>}>
      <ClientInner />
    </Suspense>
  );
}
