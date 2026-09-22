"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { projectMoney, supervisionDueOf } from "@/lib/logic";
import { dayToIso } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { PaymentClass } from "@/lib/types";

type Step = "choose" | "payment" | "expense";

function nowInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function MoneyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction, addCategory, renameCategory } = useStore();
  const presetProject = params.get("projectId") || "";
  const kindParam = params.get("kind");
  const lockedProject = Boolean(presetProject);
  const initialStep: Step =
    kindParam === "purchase" ? "expense" : kindParam === "payment" ? "payment" : "choose";
  const [step, setStep] = useState<Step>(initialStep);
  const [projectId, setProjectId] = useState(presetProject || state.projects[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [boughtAt, setBoughtAt] = useState(nowInput);
  const [categoryId, setCategoryId] = useState("");
  const [paymentClass, setPaymentClass] = useState<PaymentClass>("expense");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState("");
  const [transport, setTransport] = useState("");
  const [storage, setStorage] = useState("");
  const [busy, setBusy] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [attachSheet, setAttachSheet] = useState(false);
  const [galleryPick, setGalleryPick] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const project = state.projects.find((item) => item.id === projectId);
  const backHref = projectId
    ? `/project/?id=${encodeURIComponent(projectId)}&tab=finance`
    : "/projects/";
  const hasSupervision =
    project?.contractType === "percent"
      ? (project.supervisionPct || 0) > 0
      : project?.contractType === "fixed"
        ? typeof project.supervisionAmount === "number" || (project.supervisionPct || 0) > 0
        : false;

  function financeHref() {
    return `/project/?id=${encodeURIComponent(projectId)}&tab=finance`;
  }

  function savePayment() {
    if (!projectId || Number(amount) <= 0) return;
    addTransaction({
      projectId,
      type: "client_payment",
      amount: Number(amount),
      date: dayToIso(boughtAt),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      paymentClass,
      attachmentDataUrl: attachment,
    });
    router.push(financeHref());
  }

  function projectedRemainingAfterExpense(expenseTotal: number) {
    const money = projectMoney(state, projectId);
    const nextSpent = money.spent + expenseTotal;
    const due = supervisionDueOf(project, nextSpent);
    return money.received - nextSpent - due;
  }

  function commitPurchase() {
    const materials = Number(amount);
    const transportAmount = Number(transport) || 0;
    const storageAmount = Number(storage) || 0;
    if (!projectId || !categoryId || materials <= 0) return;
    addTransaction({
      projectId,
      type: "expense",
      amount: materials,
      transportAmount,
      storageAmount,
      date: dayToIso(boughtAt),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      categoryId,
      expenseKind: "purchase",
      attachmentDataUrl: attachment,
      supplierId: supplierId || undefined,
    });
    setConfirmOpen(false);
    router.push(financeHref());
  }

  function trySavePurchase() {
    const materials = Number(amount);
    const transportAmount = Number(transport) || 0;
    const storageAmount = Number(storage) || 0;
    if (!projectId || !categoryId || materials <= 0) return;
    const total = materials + transportAmount + storageAmount;
    if (projectedRemainingAfterExpense(total) < 0) {
      setConfirmOpen(true);
      return;
    }
    commitPurchase();
  }

  async function onFile(file?: File | null) {
    if (!file) {
      setAttachment(undefined);
      return;
    }
    setBusy(true);
    try {
      if (file.type.startsWith("image/")) {
        setAttachment(await readCompressedImage(file));
        return;
      }
      if (file.size > 1_500_000) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error("read failed"));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(file);
      });
      setAttachment(dataUrl);
    } finally {
      setBusy(false);
      setAttachSheet(false);
      setGalleryPick(false);
    }
  }

  const projectPhotos = state.photos.filter((photo) => photo.projectId === projectId);

  if (step === "choose") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--bg)] px-5 py-10">
        <p className="text-center text-sm font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="mt-8 text-center text-3xl font-black leading-snug">
          حركة فلوس عايز تسجّلها؟
        </h1>
        {project ? <p className="mt-3 text-center text-sm text-stone-500">{project.name}</p> : null}
        <div className="mt-8 space-y-3">
          <button type="button" className="card w-full py-5 text-lg font-bold" onClick={() => setStep("payment")}>
            استلمت من العميل؟
          </button>
          <button type="button" className="card w-full py-5 text-lg font-bold" onClick={() => setStep("expense")}>
            اشتريت للموقع؟
          </button>
          <Link href={backHref} className="btn btn-secondary w-full">
            رجوع
          </Link>
        </div>
      </div>
    );
  }

  if (step === "expense") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            className="text-sm text-stone-500"
            onClick={() => (kindParam ? router.push(backHref) : setStep("choose"))}
          >
            ←
          </button>
          <h1 className="text-lg font-black">تسجيل شراء مواد</h1>
          <span className="w-6" />
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            trySavePurchase();
          }}
          className="flex flex-1 flex-col px-4 py-4"
        >
          <div className="space-y-3">
            {lockedProject && project ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                <p className="text-stone-500">المشروع</p>
                <p className="font-bold">{project.name}</p>
              </div>
            ) : (
              <label className="block text-sm font-semibold">
                المشروع
                <select
                  className="input mt-1"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  {state.projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm font-semibold">
              الوصف <span className="font-normal text-stone-400">اختياري</span>
              <input
                className="input mt-1"
                placeholder="وصف المواد المشتراة"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold">
              المبلغ <span className="text-rose-600">مطلوب</span>
              <input
                className="input mt-1"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="ادخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  البند <span className="text-rose-600">مطلوب</span>
                </p>
                <button
                  type="button"
                  className="text-sm font-bold text-[var(--brand)]"
                  onClick={() => {
                    setRenameDrafts(
                      Object.fromEntries(state.categories.map((c) => [c.id, c.name])),
                    );
                    setManageCats(true);
                  }}
                >
                  إدارة البنود
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                      categoryId === category.id
                        ? "border-[var(--brand)] bg-[#f3e6dc]"
                        : "border-stone-200 bg-white"
                    }`}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm font-semibold">
                تكلفة النقل <span className="font-normal text-stone-400">اختياري</span>
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="٠"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold">
                تكلفة التشوين <span className="font-normal text-stone-400">اختياري</span>
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="٠"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm font-semibold">
              التاريخ والوقت
              <input
                className="input mt-1"
                type="datetime-local"
                value={boughtAt}
                onChange={(e) => setBoughtAt(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-semibold">
              المورد
              <select
                className="input mt-1"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">بدون مورد</option>
                {state.suppliers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              ملاحظات <span className="font-normal text-stone-400">اختياري</span>
              <textarea
                className="input mt-1 min-h-20"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
              />
            </label>

            <div>
              <p className="mb-1 text-sm font-semibold">
                الفواتير والمرفقات <span className="font-normal text-stone-400">اختياري</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 py-4 text-sm font-bold">
                  صور
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 py-4 text-sm font-bold">
                  مستندات
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {busy ? "بيتحفظ المرفق…" : attachment ? "المرفق اتضاف" : "صورة الفاتورة أو ملفها"}
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-6">
            <Link
              href={backHref}
              className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 bg-white text-xl"
              aria-label="إلغاء"
            >
              ×
            </Link>
            <button
              type="submit"
              className="grid h-14 w-14 place-items-center rounded-full bg-sky-600 text-2xl text-white disabled:opacity-50"
              disabled={busy || !categoryId}
              aria-label="حفظ"
            >
              ✓
            </button>
          </div>
        </form>

        {manageCats ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => setManageCats(false)} />
            <div className="relative z-10 max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-4">
              <h2 className="mb-3 text-center text-lg font-black">إدارة البنود</h2>
              <ul className="space-y-2">
                {state.categories.map((category) => (
                  <li key={category.id} className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={renameDrafts[category.id] ?? category.name}
                      onChange={(e) =>
                        setRenameDrafts((prev) => ({ ...prev, [category.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary shrink-0"
                      onClick={() => renameCategory(category.id, renameDrafts[category.id] ?? category.name)}
                    >
                      حفظ
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="بند جديد"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary shrink-0"
                  onClick={() => {
                    if (!newCatName.trim()) return;
                    const id = addCategory(newCatName);
                    setCategoryId(id);
                    setNewCatName("");
                  }}
                >
                  إضافة
                </button>
              </div>
              <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => setManageCats(false)}>
                تم
              </button>
            </div>
          </div>
        ) : null}

        {confirmOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center">
              <h2 className="text-lg font-black">المصروفات هتتجاوز المتبقي</h2>
              <p className="mt-2 text-sm text-stone-600">
                بعد الحفظ المتبقي هيبقى بالسالب. متأكد تسجّل الحركة؟
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn btn-primary flex-1" onClick={commitPurchase}>
                  تأكيد
                </button>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmOpen(false)}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] px-4 py-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-sm text-stone-500"
          onClick={() => (kindParam ? router.push(backHref) : setStep("choose"))}
        >
          ←
        </button>
        <h1 className="text-lg font-black">تسجيل مدفوعات من العميل</h1>
        <span className="w-6" />
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          savePayment();
        }}
        className="space-y-3"
      >
        {lockedProject && project ? (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm">
            <p className="text-stone-500">المشروع</p>
            <p className="font-bold">{project.name}</p>
          </div>
        ) : (
          <label className="block text-sm font-semibold">
            المشروع
            <select
              className="input mt-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              {state.projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold">
          المبلغ <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="أدخل المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold">تصنيف المدفوعات</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-2xl border px-3 py-3 text-sm font-bold ${
                paymentClass === "expense"
                  ? "border-[var(--brand)] bg-[#f3e6dc]"
                  : "border-stone-200 bg-white"
              }`}
              onClick={() => setPaymentClass("expense")}
            >
              من المصروفات
            </button>
            <button
              type="button"
              className={`rounded-2xl border px-3 py-3 text-sm font-bold ${
                paymentClass === "supervision"
                  ? "border-[var(--brand)] bg-[#f3e6dc]"
                  : "border-stone-200 bg-white"
              }`}
              onClick={() => setPaymentClass("supervision")}
            >
              من نسبة الإشراف
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {hasSupervision
              ? "الاختيار بيتفعّل لما المشروع بنسبة إشراف أو بمبلغ إشراف ثابت، علشان تحدد لو الدفعة من المصروفات ولا من الإشراف. أي دفعة بتزوّد المستلم."
              : "الدفعة بتزوّد المستلم. تصنيف الإشراف بيتفعّل لما المشروع يبقى بنسبة أو بمبلغ إشراف."}
          </p>
        </div>

        <label className="block text-sm font-semibold">
          التاريخ والوقت <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={boughtAt}
            onChange={(e) => setBoughtAt(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          ملاحظات <span className="font-normal text-stone-400">اختياري</span>
          <input
            className="input mt-1"
            placeholder="ملاحظات إضافية عن المدفوعات..."
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold">
          ملاحظة خاصة بيك <span className="font-normal text-stone-400">مش للعميل</span>
          <textarea
            className="input mt-1 min-h-20"
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
          />
        </label>

        <div>
          <p className="mb-1 text-sm font-semibold">
            المرفقات <span className="font-normal text-stone-400">اختياري</span>
          </p>
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm font-bold text-stone-700"
            onClick={() => setAttachSheet(true)}
          >
            {busy ? "بيتحفظ المرفق…" : attachment ? "المرفق اتضاف — غيّره" : "إضافة مرفق"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
            تسجيل المدفوعات
          </button>
          <Link href={backHref} className="btn btn-secondary">
            إلغاء
          </Link>
        </div>
      </form>

      {attachSheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => setAttachSheet(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white px-4 pb-8 pt-4">
            <h2 className="mb-3 text-center text-lg font-black">إضافة مرفق</h2>
            <div className="space-y-2">
              <button
                type="button"
                className="card w-full text-center font-bold"
                onClick={() => fileRef.current?.click()}
              >
                الملفات
              </button>
              <button
                type="button"
                className="card w-full text-center font-bold"
                onClick={() => {
                  setAttachSheet(false);
                  setGalleryPick(true);
                }}
              >
                المعرض
              </button>
              <button
                type="button"
                className="card w-full text-center font-bold"
                onClick={() => cameraRef.current?.click()}
              >
                الكاميرا
              </button>
              <button type="button" className="btn btn-secondary w-full" onClick={() => setAttachSheet(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {galleryPick ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => setGalleryPick(false)} />
          <div className="relative z-10 max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-4">
            <h2 className="mb-3 text-center text-lg font-black">صور المشروع</h2>
            {projectPhotos.length === 0 ? (
              <p className="text-center text-sm text-stone-500">مفيش صور متسجلة على المشروع ده.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {projectPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="overflow-hidden rounded-2xl border border-stone-200"
                    onClick={() => {
                      setAttachment(photo.dataUrl);
                      setGalleryPick(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.dataUrl} alt={photo.caption || "صورة"} className="h-28 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => setGalleryPick(false)}>
              رجوع
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MoneyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-stone-500">جاري التحميل…</div>}>
      <MoneyInner />
    </Suspense>
  );
}
