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
  onUpdateAlbum: (albumId: string, patch: { name?: string; description?: string; sharedWithClient?: boolean }) => void;
  onDeleteAlbum: (albumId: string) => void;
  onAddPhoto: (input: { projectId: string; albumId?: string; dataUrl: string; caption?: string; sharedWithClient?: boolean }) => string;
  onUpdatePhoto: (photoId: string, patch: { caption?: string; albumId?: string; sharedWithClient?: boolean }) => void;
  onDeletePhoto: (photoId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [editor, setEditor] = useState<Album | "new" | null>(null);
  const [menuId, setMenuId] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState("");
  const [moving, setMoving] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
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
        sharedWithClient: album.sharedWithClient,
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
    return (
      <div className="mt-3 space-y-3 pb-24">
        <div className="flex items-center gap-2">
          <button type="button" className="text-sm font-bold text-stone-500" onClick={() => setAlbumId("")}>
            رجوع
          </button>
          <p className="min-w-0 flex-1 truncate text-center font-black">{album.name}</p>
          <button type="button" className="text-sm font-bold" aria-label="تعديل الألبوم" onClick={() => setEditor(album)}>
            ✎
          </button>
          {albumPhotos.length > 0 ? (
            <button
              type="button"
              className="text-sm font-bold text-rose-700"
              aria-label="حذف الألبوم"
              onClick={() => {
                if (!window.confirm("تحذف الألبوم وصوره؟")) return;
                onDeleteAlbum(album.id);
                setAlbumId("");
              }}
            >
              حذف
            </button>
          ) : null}
        </div>

        {albumPhotos.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-lg font-black">لا توجد صور في هذا الألبوم</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-stone-500">ارفع أول صورة لتوثيق تقدم العمل في هذا الألبوم.</p>
            <button type="button" className="btn btn-primary mx-auto mt-4" onClick={() => setUploadOpen(true)}>
              رفع صور
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setUploadOpen(true)}>
                رفع صور
              </button>
              <button type="button" className="rounded-full bg-white px-3 py-1 text-sm font-bold" onClick={() => setNewestFirst((value) => !value)}>
                {newestFirst ? "الأحدث أولًا" : "الأقدم أولًا"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {albumPhotos.map((photo) => (
                <button key={photo.id} type="button" className="overflow-hidden rounded-2xl bg-white" onClick={() => setOpenId(photo.id)}>
                  <PhotoThumb photo={photo} />
                </button>
              ))}
            </div>
          </>
        )}

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

        {open ? (
          <Viewer
            albumName={album.name}
            photo={open}
            index={openIndex}
            total={albumPhotos.length}
            albums={albums.filter((item) => item.id !== album.id)}
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
              onUpdatePhoto(open.id, { albumId: target.id, sharedWithClient: target.sharedWithClient });
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
            onDelete={() => {
              onDeletePhoto(open.id);
              setOpenId("");
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 pb-24">
      <input
        className="input"
        placeholder="بحث في الألبومات والصور..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shownAlbums.length === 0 ? (
        <p className="card text-sm text-stone-500">{albums.length === 0 ? "لسه مفيش ألبومات." : "مفيش ألبوم بالاسم ده."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shownAlbums.map((item) => {
            const rows = photos.filter((photo) => photo.albumId === item.id);
            const cover = rows[0];
            return (
              <div key={item.id} className="relative">
                <button type="button" className="w-full text-right" onClick={() => setAlbumId(item.id)}>
                  <div className="relative overflow-hidden rounded-2xl bg-emerald-50">
                    {cover ? <PhotoThumb photo={cover} /> : <span className="grid aspect-square place-items-center text-3xl text-emerald-700/40">▦</span>}
                    <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                      {rows.length.toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-black">{item.name}</p>
                  <p className="text-xs text-stone-500">{item.sharedWithClient ? "مشترك مع العميل" : "خاص"}</p>
                </button>
                <button
                  type="button"
                  className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg font-black"
                  aria-label="قائمة الألبوم"
                  onClick={() => setMenuId(menuId === item.id ? "" : item.id)}
                >
                  …
                </button>
                {menuId === item.id ? (
                  <div className="absolute top-12 left-2 z-10 w-32 rounded-2xl bg-white p-1 shadow-lg">
                    <button type="button" className="block w-full rounded-xl px-3 py-2 text-right text-sm font-bold" onClick={() => { setMenuId(""); setEditor(item); }}>
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-rose-700"
                      onClick={() => {
                        setMenuId("");
                        if (!window.confirm("تحذف الألبوم وصوره؟")) return;
                        onDeleteAlbum(item.id);
                      }}
                    >
                      حذف
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
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

function AlbumForm({
  album,
  onCancel,
  onSave,
}: {
  album?: Album;
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
    <form className="mt-3 space-y-3" onSubmit={submit}>
      <div className="flex items-center gap-2">
        <button type="button" className="text-sm font-bold text-stone-500" onClick={onCancel}>
          رجوع
        </button>
        <p className="flex-1 text-center font-black">{album ? "تعديل الألبوم" : "إنشاء ألبوم جديد"}</p>
        <span className="w-10" />
      </div>
      <label className="block text-sm font-semibold">
        اسم الألبوم <span className="text-rose-600">مطلوب</span>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm font-semibold">
        وصف <span className="font-normal text-stone-400">اختياري</span>
        <input className="input mt-1" placeholder="وصف اختياري..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm font-semibold">
        مشترك مع العميل
        <button
          type="button"
          role="switch"
          aria-checked={shared}
          className={`h-7 w-12 rounded-full p-1 ${shared ? "bg-[var(--brand)]" : "bg-stone-300"}`}
          onClick={() => setShared((value) => !value)}
        >
          <span className={`block h-5 w-5 rounded-full bg-white transition ${shared ? "translate-x-0" : "-translate-x-5"}`} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          {album ? "حفظ" : "إنشاء"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3">
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

function Viewer({
  albumName,
  photo,
  index,
  total,
  albums,
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
  onDelete,
}: {
  albumName: string;
  photo: Photo;
  index: number;
  total: number;
  albums: Album[];
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
  onDelete: () => void;
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
      <p className="px-4 text-center text-sm text-stone-300">تم رفعها في {formatDay(photo.createdAt)}</p>
      {photo.caption ? <p className="px-4 pb-2 text-center text-sm">{photo.caption}</p> : null}
      <div className="grid grid-cols-4 gap-2 px-4 py-4 text-center text-sm">
        <button type="button" onClick={onMove}>نقل</button>
        <button type="button" onClick={onEdit}>تعديل</button>
        <a href={photo.dataUrl} download>تحميل</a>
        <button type="button" className="text-rose-300" onClick={onDelete}>حذف</button>
      </div>
      {moving ? (
        <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-white p-4 text-stone-900">
          <p className="mb-2 text-center font-black">انقل الصورة لألبوم</p>
          {albums.length === 0 ? <p className="text-sm text-stone-500">مفيش ألبوم تاني.</p> : null}
          <div className="space-y-2">
            {albums.map((item) => (
              <button key={item.id} type="button" className="card w-full text-center font-bold" onClick={() => onPickAlbum(item)}>
                {item.name}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary mt-2 w-full" onClick={onCloseMove}>
            إلغاء
          </button>
        </div>
      ) : null}
      {editingCaption ? (
        <div className="absolute inset-x-3 bottom-3 rounded-3xl bg-white p-4 text-stone-900">
          <p className="mb-2 text-center font-black">تعديل الوصف</p>
          <input className="input" value={captionDraft} onChange={(e) => onCaptionDraft(e.target.value)} placeholder="أضف وصفًا للصورة..." />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-primary" onClick={onSaveCaption}>حفظ</button>
            <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>إلغاء</button>
          </div>
        </div>
      ) : null}
    </div>
  );
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
