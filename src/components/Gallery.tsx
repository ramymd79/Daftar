"use client";

import { FormEvent, useMemo, useRef, useState, type RefObject } from "react";
import { readCompressedImage } from "@/lib/images";
import { formatDay } from "@/lib/money";
import type { Album } from "@/lib/types";

type Photo = {
  id: string;
  albumId?: string;
  dataUrl: string;
  caption?: string;
  hiddenFromClient?: boolean;
  createdAt: string;
};

type QueueItem = {
  key: string;
  file: File;
  caption: string;
  status: "wait" | "uploading" | "done";
};

export function Gallery({
  projectId,
  albums,
  photos,
  onAddAlbum,
  onUpdateAlbum,
  onDeleteAlbum,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}: {
  projectId: string;
  albums: Album[];
  photos: Photo[];
  onAddAlbum: (input: { projectId: string; name: string; description?: string; sharedWithClient: boolean }) => string;
  onUpdateAlbum: (albumId: string, patch: { name?: string; description?: string; sharedWithClient?: boolean; coverPhotoId?: string | null }) => void;
  onDeleteAlbum: (albumId: string) => void;
  onAddPhoto: (input: { projectId: string; albumId?: string; dataUrl: string; caption?: string; sharedWithClient?: boolean }) => string;
  onUpdatePhoto: (photoId: string, patch: { caption?: string; albumId?: string; hiddenFromClient?: boolean }) => void;
  onDeletePhoto: (photoId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [editor, setEditor] = useState<Album | "new" | null>(null);
  const [sheetAlbumId, setSheetAlbumId] = useState("");
  const [deleteAlbumId, setDeleteAlbumId] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<"newest" | "oldest" | "name" | "nameDesc" | "count" | "countAsc">("newest");
  const [kindFilter, setKindFilter] = useState<"all" | "photos" | "video" | "shared">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState("");
  const [optionsId, setOptionsId] = useState("");
  const [hideAsk, setHideAsk] = useState(false);
  const [moving, setMoving] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkHide, setBulkHide] = useState(false);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkMove, setBulkMove] = useState(false);
  const filesRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const album = albums.find((item) => item.id === albumId);
  const shownAlbums = albums.filter((item) => {
    const text = query.trim();
    if (!text) return true;
    if (item.name.includes(text) || (item.description || "").includes(text)) return true;
    return photos.some((photo) => photo.albumId === item.id && (photo.caption || "").includes(text));
  });

  const albumPhotos = useMemo(() => {
    const rows = photos.filter((photo) => photo.albumId === albumId);
    return [...rows].sort((a, b) =>
      newestFirst ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
  }, [photos, albumId, newestFirst]);
  const openIndex = albumPhotos.findIndex((photo) => photo.id === openId);
  const open = openIndex >= 0 ? albumPhotos[openIndex] : undefined;
  const option = photos.find((photo) => photo.id === optionsId);
  const doneCount = queue.filter((item) => item.status === "done").length;

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...list].map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      caption: "",
      status: "wait" as const,
    }));
    setQueue((prev) => [...prev, ...next]);
  }

  async function startUpload() {
    if (!album || queue.length === 0 || uploading) return;
    setUploading(true);
    for (const item of queue) {
      if (item.status === "done") continue;
      setQueue((prev) => prev.map((row) => (row.key === item.key ? { ...row, status: "uploading" } : row)));
      const dataUrl = item.file.type.startsWith("image/")
        ? await readCompressedImage(item.file)
        : await readAsDataUrl(item.file);
      onAddPhoto({
        projectId,
        albumId: album.id,
        dataUrl,
        caption: item.caption,
      });
      setQueue((prev) => prev.map((row) => (row.key === item.key ? { ...row, status: "done" } : row)));
    }
    setUploading(false);
    setQueue([]);
    setUploadOpen(false);
  }

  if (editor) {
    return (
      <AlbumForm
        album={editor === "new" ? undefined : editor}
        photoCount={editor === "new" ? 0 : photos.filter((photo) => photo.albumId === editor.id).length}
        onCancel={() => setEditor(null)}
        onSave={(input) => {
          if (editor === "new") {
            onAddAlbum({ projectId, ...input });
          } else {
            onUpdateAlbum(editor.id, input);
          }
          setEditor(null);
        }}
      />
    );
  }

  if (album) {
    const deleting = albums.find((item) => item.id === deleteAlbumId);
    return (
      <div className="mt-3 space-y-3 pb-24">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem_2.75rem] items-center gap-2">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white"
            aria-label="رجوع"
            onClick={() => setAlbumId("")}
          >
            <span aria-hidden="true">→</span>
          </button>
          <p className="min-w-0 truncate text-center font-black">{album.name}</p>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white"
            aria-label="تعديل الألبوم"
            onClick={() => setEditor(album)}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600"
            aria-label="حذف الألبوم"
            onClick={() => setDeleteAlbumId(album.id)}
          >
            <TrashIcon />
          </button>
        </div>

        {albumPhotos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-[#f3e6df] text-[var(--brand)]">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M8 7.5 9.2 5.5h5.6L16 7.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="4" y="7.5" width="16" height="11" rx="2.5" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span className="absolute -top-1 -left-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--fab)] text-lg font-black text-white">+</span>
            </div>
            <p className="mt-6 text-xl font-black">لا توجد صور في هذا الألبوم</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-stone-500">ارفع أول صورة لتوثيق تقدم العمل في هذا الألبوم.</p>
            <p className="mt-4 text-sm text-stone-500">{(0).toLocaleString("ar-EG")} صورة</p>
            <button type="button" className="btn btn-primary mx-auto mt-4" onClick={() => setUploadOpen(true)}>
              رفع صور
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              {picked.length > 0 ? (
                <p className="font-black">{picked.length.toLocaleString("ar-EG")} محددة</p>
              ) : (
                <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setUploadOpen(true)}>
                  رفع صور
                </button>
              )}
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-full bg-white px-3 py-1 text-sm font-bold" onClick={() => setNewestFirst((value) => !value)}>
                  {newestFirst ? "الأحدث أولًا" : "الأقدم أولًا"}
                </button>
                {picked.length > 0 ? (
                  <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white font-black" aria-label="إغلاق" onClick={() => setPicked([])}>
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {albumPhotos.map((photo) => {
                const on = picked.includes(photo.id);
                return (
                  <div key={photo.id} className="relative overflow-hidden rounded-2xl bg-white">
                    <button
                      type="button"
                      className="block w-full text-right"
                      onClick={() => {
                        if (picked.length > 0) {
                          setPicked((prev) => (prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]));
                          return;
                        }
                        setOpenId(photo.id);
                      }}
                    >
                      <PhotoThumb photo={photo} />
                      {photo.hiddenFromClient ? (
                        <span className="absolute bottom-2 right-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[11px] font-bold text-white">مخفية</span>
                      ) : null}
                      {on ? (
                        <span className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--brand)] text-sm text-white">✓</span>
                      ) : null}
                    </button>
                    {picked.length === 0 ? (
                      <button
                        type="button"
                        className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg font-black"
                        aria-label="خيارات الصورة"
                        onClick={() => {
                          setOptionsId(photo.id);
                          setHideAsk(false);
                        }}
                      >
                        …
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {picked.length > 0 ? (
              <div className="fixed inset-x-0 bottom-20 z-50 mx-auto grid max-w-lg grid-cols-3 gap-2 px-4">
                <button type="button" className="btn bg-rose-600 text-white" onClick={() => setBulkDelete(true)}>حذف</button>
                <button type="button" className="btn btn-secondary" onClick={() => setBulkHide(true)}>إخفاء</button>
                <button type="button" className="btn btn-secondary" onClick={() => setBulkMove(true)}>نقل</button>
              </div>
            ) : null}
          </>
        )}

        {picked.length === 0 ? (
        <button
          type="button"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fab)] text-2xl text-white shadow-lg"
          aria-label="الكاميرا"
          onClick={() => cameraRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 7.5 9.2 5.5h5.6L16 7.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="4" y="7.5" width="16" height="11" rx="2.5" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </button>
        ) : null}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
            setUploadOpen(true);
          }}
        />

        {uploadOpen ? (
          <UploadSheet
            albumName={album.name}
            queue={queue}
            uploading={uploading}
            doneCount={doneCount}
            filesRef={filesRef}
            galleryRef={galleryRef}
            cameraRef={cameraRef}
            onAddFiles={addFiles}
            onCaption={(key, caption) => setQueue((prev) => prev.map((row) => (row.key === key ? { ...row, caption } : row)))}
            onRemove={(key) => setQueue((prev) => prev.filter((row) => row.key !== key))}
            onClear={() => setQueue([])}
            onClose={() => {
              if (uploading) return;
              setUploadOpen(false);
            }}
            onStart={startUpload}
          />
        ) : null}

        {option ? (
          <PhotoOptions
            album={album}
            photo={option}
            albums={albums.filter((item) => item.id !== album.id)}
            counts={Object.fromEntries(albums.map((item) => [item.id, photos.filter((photo) => photo.albumId === item.id).length]))}
            hideAsk={hideAsk}
            editing={editingCaption}
            captionDraft={captionDraft}
            onClose={() => {
              setOptionsId("");
              setHideAsk(false);
              setEditingCaption(false);
            }}
            onOpen={() => setOpenId(option.id)}
            onEdit={() => {
              setCaptionDraft(option.caption || "");
              setEditingCaption(true);
            }}
            onCaptionDraft={setCaptionDraft}
            onSaveCaption={() => {
              onUpdatePhoto(option.id, { caption: captionDraft });
              setEditingCaption(false);
            }}
            onCancelEdit={() => setEditingCaption(false)}
            onAskHide={() => setHideAsk(true)}
            onCancelHide={() => setHideAsk(false)}
            onHide={() => {
              onUpdatePhoto(option.id, { hiddenFromClient: true });
              setHideAsk(false);
            }}
            onShow={() => onUpdatePhoto(option.id, { hiddenFromClient: false })}
            onMove={(targetId) => {
              onUpdatePhoto(option.id, { albumId: targetId });
              setOptionsId("");
            }}
            onSelect={() => {
              setPicked([option.id]);
              setOptionsId("");
            }}
            onCover={() => {
              onUpdateAlbum(album.id, { coverPhotoId: option.id });
              setOptionsId("");
            }}
            onDelete={() => {
              onDeletePhoto(option.id);
              setOptionsId("");
              if (openId === option.id) setOpenId("");
            }}
          />
        ) : null}

        {open ? (
          <Viewer
            albumName={album.name}
            photo={open}
            index={openIndex}
            total={albumPhotos.length}
            albums={albums.filter((item) => item.id !== album.id)}
            counts={Object.fromEntries(albums.map((item) => [item.id, photos.filter((photo) => photo.albumId === item.id).length]))}
            moving={moving}
            editingCaption={editingCaption}
            captionDraft={captionDraft}
            onClose={() => {
              setOpenId("");
              setMoving(false);
              setEditingCaption(false);
            }}
            onPrev={() => setOpenId(albumPhotos[(openIndex - 1 + albumPhotos.length) % albumPhotos.length].id)}
            onNext={() => setOpenId(albumPhotos[(openIndex + 1) % albumPhotos.length].id)}
            onMove={() => setMoving(true)}
            onCloseMove={() => setMoving(false)}
            onCancelEdit={() => setEditingCaption(false)}
            onPickAlbum={(target) => {
              onUpdatePhoto(open.id, { albumId: target.id });
              setMoving(false);
              setOpenId("");
            }}
            onEdit={() => {
              setCaptionDraft(open.caption || "");
              setEditingCaption(true);
            }}
            onCaptionDraft={setCaptionDraft}
            onSaveCaption={() => {
              onUpdatePhoto(open.id, { caption: captionDraft });
              setEditingCaption(false);
            }}
          />
        ) : null}
        {deleting ? (
          <AlbumDeleteDialog
            name={deleting.name}
            onCancel={() => setDeleteAlbumId("")}
            onConfirm={() => {
              onDeleteAlbum(deleting.id);
              setDeleteAlbumId("");
              setAlbumId("");
              setPicked([]);
            }}
          />
        ) : null}
        {bulkDelete ? (
          <ConfirmCard
            title="حذف العناصر المحددة"
            body={`هل أنت متأكد من حذف ${picked.length === 1 ? "عنصر واحد" : `${picked.length.toLocaleString("ar-EG")} عناصر`} من ألبوم «${album.name}»؟ لا يمكن التراجع عن هذا الإجراء.`}
            confirmLabel="حذف"
            danger
            onCancel={() => setBulkDelete(false)}
            onConfirm={() => {
              picked.forEach((id) => onDeletePhoto(id));
              setPicked([]);
              setBulkDelete(false);
            }}
          />
        ) : null}
        {bulkHide ? (
          <ConfirmCard
            title="إخفاء العناصر المحددة"
            body={`لن يتمكن العميل من رؤية ${picked.length.toLocaleString("ar-EG")} عنصر. هل تريد المتابعة؟`}
            confirmLabel="إخفاء"
            onCancel={() => setBulkHide(false)}
            onConfirm={() => {
              picked.forEach((id) => onUpdatePhoto(id, { hiddenFromClient: true }));
              setPicked([]);
              setBulkHide(false);
            }}
          />
        ) : null}
        {bulkMove ? (
          <MoveSheet
            fromName={album.name}
            targets={albums.filter((item) => item.id !== album.id).map((item) => ({
              id: item.id,
              name: item.name,
              count: photos.filter((photo) => photo.albumId === item.id).length,
            }))}
            onClose={() => setBulkMove(false)}
            onMove={(targetId) => {
              picked.forEach((id) => onUpdatePhoto(id, { albumId: targetId }));
              setPicked([]);
              setBulkMove(false);
            }}
          />
        ) : null}
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-[#f3e6df] text-[var(--brand)]">
          <ImageIcon />
          <span className="absolute -top-1 -left-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--fab)] text-lg font-black text-white">
            +
          </span>
        </div>
        <p className="mt-6 text-xl font-black">لا توجد ألبومات بعد</p>
        <p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">
          أنشئ أول ألبوم لتنظيم صور المشروع ومشاركتها مع العميل.
        </p>
        <button type="button" className="btn btn-primary mt-6 px-8" onClick={() => setEditor("new")}>
          إنشاء ألبوم
        </button>
        <button
          type="button"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fab)] text-3xl text-white shadow-lg"
          aria-label="ألبوم جديد"
          onClick={() => setEditor("new")}
        >
          +
        </button>
      </div>
    );
  }

  const loose = photos.filter((photo) => !photo.albumId);
  const orderedAlbums = [...shownAlbums]
    .filter((item) => {
      const rows = photos.filter((photo) => photo.albumId === item.id);
      if (kindFilter === "shared") return item.sharedWithClient;
      if (kindFilter === "video") return rows.some((photo) => photo.dataUrl.startsWith("data:video"));
      if (kindFilter === "photos") return rows.length > 0 && rows.every((photo) => !photo.dataUrl.startsWith("data:video"));
      return true;
    })
    .sort((a, b) => {
      const count = (id: string) => photos.filter((photo) => photo.albumId === id).length;
      if (sortKey === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortKey === "name") return a.name.localeCompare(b.name, "ar");
      if (sortKey === "nameDesc") return b.name.localeCompare(a.name, "ar");
      if (sortKey === "count") return count(b.id) - count(a.id);
      if (sortKey === "countAsc") return count(a.id) - count(b.id);
      return b.createdAt.localeCompare(a.createdAt);
    });
  const sheetAlbum = albums.find((item) => item.id === sheetAlbumId);
  const deleting = albums.find((item) => item.id === deleteAlbumId);

  return (
    <div className="mt-3 space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-white" aria-label="تصفية وفرز" onClick={() => setFilterOpen(true)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
        </button>
        <input
          className="input"
          placeholder="بحث في الألبومات والصور..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {orderedAlbums.length === 0 ? (
        <p className="card text-sm text-stone-500">مفيش ألبوم بالاسم ده.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {orderedAlbums.map((item) => {
            const rows = photos.filter((photo) => photo.albumId === item.id);
            const cover = rows.find((photo) => photo.id === item.coverPhotoId) || rows[0];
            return (
              <div key={item.id} className="overflow-hidden rounded-3xl bg-white">
                <button type="button" className="relative block w-full text-right" onClick={() => setAlbumId(item.id)}>
                  <div className="relative bg-[#e7f2ea]">
                    {cover ? <PhotoThumb photo={cover} /> : (
                      <span className="grid aspect-[4/3] place-items-center text-[var(--brand)]">
                        <ImageIcon />
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-full bg-stone-800/80 px-2 py-0.5 text-xs font-bold text-white">
                      {rows.length.toLocaleString("ar-EG")}
                    </span>
                  </div>
                </button>
                <div className="flex items-start gap-1 px-3 py-2">
                  <button type="button" className="px-1 text-lg font-black leading-none text-stone-500" aria-label="خيارات الألبوم" onClick={() => setSheetAlbumId(item.id)}>
                    …
                  </button>
                  <button type="button" className="min-w-0 flex-1 text-right" onClick={() => setAlbumId(item.id)}>
                    <p className="truncate font-black">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.sharedWithClient ? "مشترك مع العميل" : "خاص"}</p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {loose.length > 0 ? (
        <section className="space-y-2">
          <p className="font-black">كل الوسائط</p>
          <p className="text-xs text-stone-500">لسه مش شغالة</p>
          <div className="grid grid-cols-2 gap-2">
            {loose.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-2xl bg-white">
                <PhotoThumb photo={photo} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fab)] text-3xl text-white shadow-lg"
        aria-label="ألبوم جديد"
        onClick={() => setEditor("new")}
      >
        +
      </button>
      {sheetAlbum ? (
        <AlbumOptionsSheet
          album={sheetAlbum}
          count={photos.filter((photo) => photo.albumId === sheetAlbum.id).length}
          onClose={() => setSheetAlbumId("")}
          onRename={() => {
            setSheetAlbumId("");
            setEditor(sheetAlbum);
          }}
          onShare={() => onUpdateAlbum(sheetAlbum.id, { sharedWithClient: !sheetAlbum.sharedWithClient })}
          onDelete={() => {
            setSheetAlbumId("");
            setDeleteAlbumId(sheetAlbum.id);
          }}
        />
      ) : null}
      {deleting ? (
        <AlbumDeleteDialog
          name={deleting.name}
          onCancel={() => setDeleteAlbumId("")}
          onConfirm={() => {
            onDeleteAlbum(deleting.id);
            setDeleteAlbumId("");
          }}
        />
      ) : null}
      {filterOpen ? (
        <FilterSheet
          sortKey={sortKey}
          kindFilter={kindFilter}
          albumCount={albums.length}
          onSort={setSortKey}
          onKind={setKindFilter}
          onReset={() => {
            setSortKey("newest");
            setKindFilter("all");
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
    </div>
  );
}

function AlbumOptionsSheet({
  album,
  count,
  onClose,
  onRename,
  onShare,
  onDelete,
}: {
  album: Album;
  count: number;
  onClose: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="w-8" />
          <div className="text-center">
            <p className="font-black">خيارات الألبوم</p>
            <p className="text-xs text-stone-500">بطاقة الألبوم في معرض المشروع</p>
          </div>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="card mb-3 flex items-center justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3e6df] text-[var(--brand)]">
            <ImageIcon />
          </span>
          <span className="text-right">
            <span className="block font-black">{album.name}</span>
            <span className="text-xs text-stone-500">
              {album.sharedWithClient ? "مشترك مع العميل" : "خاص"}، {count.toLocaleString("ar-EG")} صورة
            </span>
          </span>
        </div>
        <div className="space-y-2">
          <OptionRow title="إعادة التسمية" hint="غيّر اسم الألبوم أو إعداداته." onClick={onRename} />
          {album.sharedWithClient ? (
            <OptionRow title="إلغاء المشاركة مع العميل" hint="اجعل الألبوم خاصاً بفريق المشروع." onClick={onShare} />
          ) : (
            <OptionRow title="مشاركة مع العميل" hint="اجعل الألبوم مرئياً في بوابة العميل." onClick={onShare} />
          )}
          <button type="button" className="card w-full text-right" onClick={onDelete}>
            <span className="block font-bold text-rose-700">حذف</span>
            <span className="text-xs text-stone-500">احذف الألبوم من معرض المشروع.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AlbumDeleteDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-4 text-center">
        <p className="text-lg font-black">حذف الألبوم</p>
        <p className="mt-2 text-sm text-stone-600">هل أنت متأكد من حذف ألبوم «{name}»؟</p>
        <p className="mt-2 text-sm text-stone-600">سيتم نقل الوسائط إلى قسم كل الوسائط ولن يتم حذفها.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn bg-rose-600 text-white" onClick={onConfirm}>حذف</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function FilterSheet({
  sortKey,
  kindFilter,
  albumCount,
  onSort,
  onKind,
  onReset,
  onClose,
}: {
  sortKey: "newest" | "oldest" | "name" | "nameDesc" | "count" | "countAsc";
  kindFilter: "all" | "photos" | "video" | "shared";
  albumCount: number;
  onSort: (value: "newest" | "oldest" | "name" | "nameDesc" | "count" | "countAsc") => void;
  onKind: (value: "all" | "photos" | "video" | "shared") => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const sorts = [
    ["newest", "التاريخ الأحدث"],
    ["oldest", "التاريخ الأقدم"],
    ["name", "اسم الألبوم أ-ي"],
    ["nameDesc", "اسم الألبوم ي-أ"],
    ["count", "عدد الصور الأكثر"],
    ["countAsc", "عدد الصور الأقل"],
  ] as const;
  const kinds = [
    ["photos", "صور"],
    ["video", "فيديو"],
    ["shared", "مشترك"],
  ] as const;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={onReset}>إعادة تعيين</button>
          <p className="font-black">تصفية وفرز</p>
          <span className="w-16" />
        </div>
        <div className="space-y-2">
          {sorts.map(([key, label]) => (
            <label key={key} className="card flex items-center justify-between text-sm font-bold">
              {label}
              <input type="radio" name="album-sort" checked={sortKey === key} onChange={() => onSort(key)} />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.map(([key, label]) => (
            <button key={key} type="button" className={`rounded-full px-3 py-1 text-sm font-bold ${kindFilter === key ? "bg-[var(--brand)] text-white" : "bg-white"}`} onClick={() => onKind(kindFilter === key ? "all" : key)}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold">كل الألبومات ({albumCount.toLocaleString("ar-EG")})</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={onClose}>تطبيق الفلاتر</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlbumForm({
  album,
  photoCount = 0,
  onCancel,
  onSave,
}: {
  album?: Album;
  photoCount?: number;
  onCancel: () => void;
  onSave: (input: { name: string; description?: string; sharedWithClient: boolean }) => void;
}) {
  const [name, setName] = useState(album?.name || "");
  const [description, setDescription] = useState(album?.description || "");
  const [shared, setShared] = useState(album?.sharedWithClient ?? false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, description, sharedWithClient: shared });
  }

  return (
    <form className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)]" onSubmit={submit}>
      <div className="mx-auto grid w-full max-w-lg grid-cols-[2.75rem_1fr_2.75rem] items-center px-4 py-4">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white"
          aria-label="رجوع"
          onClick={onCancel}
        >
          <span aria-hidden="true">→</span>
        </button>
        <p className="text-center text-lg font-black">{album ? "تعديل الألبوم" : "إنشاء ألبوم جديد"}</p>
        <span />
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 overflow-y-auto px-4">
        {album ? (
          <div className="card flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3e6df] text-[var(--brand)]">
              <ImageIcon />
            </span>
            <span className="text-right">
              <span className="block font-black">{album.name}</span>
              <span className="text-xs text-stone-500">
                {shared ? "مشترك مع العميل" : "خاص"}، {photoCount.toLocaleString("ar-EG")} صورة
              </span>
            </span>
          </div>
        ) : null}
        <FieldLabel label="اسم الألبوم" hint="مطلوب" />
        <input
          className="input"
          placeholder="اسم الألبوم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {album ? null : (
          <>
            <FieldLabel label="وصف" hint="اختياري" />
            <input
              className="input"
              placeholder="وصف اختياري..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        )}
        <p className="pt-2 text-sm font-bold">المشاركة مع العميل</p>
        <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm font-semibold">
          مشترك مع العميل
          <button
            type="button"
            role="switch"
            aria-checked={shared}
            aria-label="مشترك مع العميل"
            className={`flex h-7 w-12 items-center rounded-full p-1 ${shared ? "justify-start bg-[var(--brand)]" : "justify-end bg-stone-300"}`}
            onClick={() => setShared((value) => !value)}
          >
            <span className="block h-5 w-5 rounded-full bg-white" />
          </button>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2 px-4 py-4">
        <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={!name.trim()}>
          {album ? "حفظ التعديلات" : "إنشاء"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between text-sm font-bold">
      <span>{label}</span>
      <span className="font-normal text-stone-400">{hint}</span>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M7 17l4-4 3 3 2-2 3 3" />
    </svg>
  );
}

function UploadSheet({
  albumName,
  queue,
  uploading,
  doneCount,
  filesRef,
  galleryRef,
  cameraRef,
  onAddFiles,
  onCaption,
  onRemove,
  onClear,
  onClose,
  onStart,
}: {
  albumName: string;
  queue: QueueItem[];
  uploading: boolean;
  doneCount: number;
  filesRef: RefObject<HTMLInputElement | null>;
  galleryRef: RefObject<HTMLInputElement | null>;
  cameraRef: RefObject<HTMLInputElement | null>;
  onAddFiles: (list: FileList | null) => void;
  onCaption: (key: string, caption: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
  onStart: () => void;
}) {
  const total = queue.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3">
      <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-3xl bg-[var(--bg)] p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="w-6" />
          <h2 className="font-black">رفع صور للألبوم</h2>
          <button type="button" className="text-xl" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        <p className="mb-3 text-center text-sm text-stone-500">{albumName}</p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Pick label="الملفات" hint="صور أو PDF" onClick={() => filesRef.current?.click()} />
          <Pick label="المعرض" hint="اختر من الجهاز" onClick={() => galleryRef.current?.click()} />
          <Pick label="الكاميرا" hint="التقط صورة" onClick={() => cameraRef.current?.click()} />
        </div>
        <input ref={filesRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { onAddFiles(e.target.files); e.target.value = ""; }} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onAddFiles(e.target.files); e.target.value = ""; }} />
        <div className="mb-3 flex items-center justify-between text-sm">
          <button type="button" className="font-bold text-rose-700" onClick={onClear} disabled={uploading || total === 0}>
            إلغاء الكل
          </button>
          <p className="font-bold">
            {doneCount.toLocaleString("ar-EG")} من {total.toLocaleString("ar-EG")} اكتملت
          </p>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mb-3 text-center text-xs text-stone-500">إجمالي التقدم {pct.toLocaleString("ar-EG")}٪</p>
        <ul className="mb-3 space-y-2">
          {queue.map((item) => (
            <li key={item.key} className="rounded-2xl bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="text-stone-400" aria-label="إزالة" onClick={() => onRemove(item.key)} disabled={uploading}>
                  ×
                </button>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold">{item.file.name}</p>
                  <p className="text-xs text-stone-500">
                    {formatSize(item.file.size)} · {item.status === "done" ? "اكتمل" : item.status === "uploading" ? "جار الرفع" : "جاهز"}
                  </p>
                </div>
              </div>
              <input
                className="input mt-2"
                placeholder="أضف وصفًا للصورة..."
                value={item.caption}
                disabled={uploading || item.status === "done"}
                onChange={(e) => onCaption(item.key, e.target.value)}
              />
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" disabled={total === 0 || uploading} onClick={onStart}>
            {uploading ? "جار الرفع..." : "إضافة"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoOptions({
  album,
  photo,
  albums,
  counts,
  hideAsk,
  editing,
  captionDraft,
  onClose,
  onOpen,
  onEdit,
  onCaptionDraft,
  onSaveCaption,
  onCancelEdit,
  onAskHide,
  onCancelHide,
  onHide,
  onShow,
  onMove,
  onSelect,
  onCover,
  onDelete,
}: {
  album: Album;
  photo: Photo;
  albums: Album[];
  counts: Record<string, number>;
  hideAsk: boolean;
  editing: boolean;
  captionDraft: string;
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onCaptionDraft: (value: string) => void;
  onSaveCaption: () => void;
  onCancelEdit: () => void;
  onAskHide: () => void;
  onCancelHide: () => void;
  onHide: () => void;
  onShow: () => void;
  onMove: (albumId: string) => void;
  onSelect: () => void;
  onCover: () => void;
  onDelete: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [deleteAsk, setDeleteAsk] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
      <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="w-6" />
          <div className="text-center">
            <p className="font-black">خيارات الصورة</p>
            <p className="text-xs text-stone-500">{album.name}</p>
          </div>
          <button type="button" className="text-xl" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        <button type="button" className="card mb-3 flex w-full items-center gap-3 text-right" onClick={onOpen}>
          <span className="block w-16 shrink-0 overflow-hidden rounded-xl">
            <PhotoThumb photo={photo} />
          </span>
          <span>
            <span className="block font-bold">{photo.caption || "صورة بدون تسمية"}</span>
            <span className="text-xs text-stone-500">{formatDay(photo.createdAt)}</span>
          </span>
        </button>
        {editing ? (
          <div className="card mb-3 space-y-2">
            <p className="font-bold">تعديل التسمية</p>
            <input className="input" value={captionDraft} onChange={(e) => onCaptionDraft(e.target.value)} placeholder="أضف وصفًا للصورة..." />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary" onClick={onSaveCaption}>حفظ</button>
              <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>إلغاء</button>
            </div>
          </div>
        ) : null}
        {moving ? (
          <MoveSheet
            fromName={album.name}
            targets={albums.map((item) => ({
              id: item.id,
              name: item.name,
              count: counts[item.id] || 0,
            }))}
            onClose={() => setMoving(false)}
            onMove={(targetId) => onMove(targetId)}
          />
        ) : (
          <div className="space-y-2">
            <OptionRow title="تحديد" hint="ابدأ اختيار عدة صور من الألبوم." onClick={onSelect} />
            <OptionRow title="تعديل التسمية" hint="غيّر الوصف الظاهر مع الصورة." onClick={onEdit} />
            {photo.hiddenFromClient ? (
              <OptionRow title="إظهار للعميل" hint="اجعل هذه الصورة مرئية في بوابة العميل." onClick={() => setShowAsk(true)} />
            ) : (
              <OptionRow title="إخفاء عن العميل" hint="لن تظهر هذه الصورة في بوابة العميل." onClick={onAskHide} />
            )}
            <OptionRow title="نقل لألبوم آخر" hint="انقل الصورة إلى ألبوم مختلف." onClick={() => setMoving(true)} />
            <OptionRow
              title="تعيين كصورة غلاف"
              hint={album.coverPhotoId === photo.id ? "دي غلاف الألبوم دلوقتي." : "استخدم هذه الصورة كغلاف للألبوم."}
              onClick={onCover}
            />
            <button type="button" className="card w-full text-right" onClick={() => setDeleteAsk(true)}>
              <span className="block font-bold text-rose-700">حذف</span>
              <span className="text-xs text-stone-500">إزالة الصورة نهائياً من المعرض.</span>
            </button>
          </div>
        )}
      </div>
      {hideAsk ? (
        <ConfirmCard
          title="إخفاء الوسائط"
          body="لن يتمكن العميل من رؤية هذا العنصر. هل تريد المتابعة؟"
          confirmLabel="إخفاء"
          onCancel={onCancelHide}
          onConfirm={onHide}
        />
      ) : null}
      {showAsk ? (
        <ConfirmCard
          title="جعل الوسائط مرئية"
          body="سيتمكن العميل من رؤية هذا العنصر. هل تريد المتابعة؟"
          confirmLabel="اجعله مرئي"
          onCancel={() => setShowAsk(false)}
          onConfirm={() => {
            setShowAsk(false);
            onShow();
          }}
        />
      ) : null}
      {deleteAsk ? (
        <ConfirmCard
          title="حذف هذه الصورة؟"
          body={`سيتم حذف هذه الصورة من ألبوم «${album.name}». لن تظهر في المعرض أو البوابة. لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف"
          danger
          onCancel={() => setDeleteAsk(false)}
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}

function ConfirmCard({
  title,
  body,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-4 text-center">
        <p className="text-lg font-black">{title}</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={`btn ${danger ? "bg-rose-600 text-white" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function MoveSheet({
  fromName,
  targets,
  onClose,
  onMove,
}: {
  fromName: string;
  targets: { id: string; name: string; count: number }[];
  onClose: () => void;
  onMove: (albumId: string) => void;
}) {
  const [chosen, setChosen] = useState("");
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 text-center">
          <p className="font-black">نقل الصورة</p>
          <p className="text-sm text-stone-500">من {fromName}</p>
        </div>
        <p className="mb-2 text-sm font-bold">اختر الألبوم الجديد</p>
        {targets.length === 0 ? <p className="text-sm text-stone-500">لا توجد ألبومات أخرى للنقل إليها</p> : null}
        <div className="space-y-2">
          {targets.map((item) => (
            <button key={item.id} type="button" className="card flex w-full items-center justify-between text-right" onClick={() => setChosen(item.id)}>
              <span>
                <span className="block font-black">{item.name}</span>
                <span className="text-xs text-stone-500">{item.count.toLocaleString("ar-EG")} صورة</span>
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${chosen === item.id ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"}`} />
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary disabled:opacity-60" disabled={!chosen} onClick={() => onMove(chosen)}>
            نقل الصورة
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="card w-full text-right" onClick={onClick}>
      <span className="block font-bold">{title}</span>
      <span className="text-xs text-stone-500">{hint}</span>
    </button>
  );
}

function Viewer({
  albumName,
  photo,
  index,
  total,
  albums,
  counts,
  moving,
  editingCaption,
  captionDraft,
  onClose,
  onPrev,
  onNext,
  onMove,
  onCloseMove,
  onPickAlbum,
  onEdit,
  onCancelEdit,
  onCaptionDraft,
  onSaveCaption,
}: {
  albumName: string;
  photo: Photo;
  index: number;
  total: number;
  albums: Album[];
  counts: Record<string, number>;
  moving: boolean;
  editingCaption: boolean;
  captionDraft: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMove: () => void;
  onCloseMove: () => void;
  onPickAlbum: (album: Album) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onCaptionDraft: (value: string) => void;
  onSaveCaption: () => void;
}) {
  const pdf = photo.dataUrl.startsWith("data:application/pdf");
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onClose} aria-label="إغلاق">
          ×
        </button>
        <p className="truncate font-bold">{albumName}</p>
        <p className="text-sm">{(index + 1).toLocaleString("ar-EG")} من {total.toLocaleString("ar-EG")}</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-10">
        {total > 1 ? (
          <button type="button" className="absolute right-2 text-2xl" onClick={onPrev} aria-label="السابقة">
            ‹
          </button>
        ) : null}
        {pdf ? (
          <a href={photo.dataUrl} download className="rounded-2xl bg-white px-4 py-6 font-bold text-stone-900">
            ملف PDF
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.dataUrl} alt={photo.caption || albumName} className="max-h-[60dvh] max-w-full object-contain" />
        )}
        {total > 1 ? (
          <button type="button" className="absolute left-2 text-2xl" onClick={onNext} aria-label="التالية">
            ›
          </button>
        ) : null}
      </div>
      {photo.caption ? <p className="px-4 text-center text-sm">{photo.caption}</p> : null}
      <p className="px-4 text-center text-sm text-stone-300">تم رفعها في {formatDay(photo.createdAt)}</p>
      <div className="grid grid-cols-4 gap-2 px-4 py-4 text-center text-sm">
        <button type="button" onClick={() => sharePhoto(photo)}>مشاركة</button>
        <button type="button" onClick={onMove}>نقل</button>
        <button type="button" onClick={onEdit}>تعديل</button>
        <a href={photo.dataUrl} download>تحميل</a>
      </div>
      {moving ? (
        <MoveSheet
          fromName={albumName}
          targets={albums.map((item) => ({
            id: item.id,
            name: item.name,
            count: counts[item.id] || 0,
          }))}
          onClose={onCloseMove}
          onMove={(id) => {
            const target = albums.find((item) => item.id === id);
            if (target) onPickAlbum(target);
          }}
        />
      ) : null}
      {editingCaption ? (
        <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-white p-4 text-stone-900">
          <p className="mb-2 text-center font-black">تعديل التسمية</p>
          <input className="input" value={captionDraft} onChange={(e) => onCaptionDraft(e.target.value)} placeholder="أضف وصفًا للصورة..." />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary" onClick={onSaveCaption}>حفظ التسمية</button>
            <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>إلغاء</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sharePhoto(photo: Photo) {
  const title = photo.caption || "صورة";
  if (typeof navigator !== "undefined" && navigator.share) {
    void navigator.share({ title, text: title }).catch(() => undefined);
  }
}

function PhotoThumb({ photo }: { photo: Photo }) {
  if (photo.dataUrl.startsWith("data:application/pdf")) {
    return <span className="grid aspect-square place-items-center bg-stone-100 text-sm font-bold">PDF</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.dataUrl} alt={photo.caption || ""} className="aspect-square w-full object-cover" />
  );
}

function Pick({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="rounded-2xl bg-white px-2 py-4 text-center" onClick={onClick}>
      <span className="block font-black">{label}</span>
      <span className="mt-1 block text-[11px] text-stone-500">{hint}</span>
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString("ar-EG")} ب`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ar-EG")} ك.ب`;
  return `${(bytes / (1024 * 1024)).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} م.ب`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
