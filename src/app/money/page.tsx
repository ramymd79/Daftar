"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { projectMoney, supervisionDueOf } from "@/lib/logic";
import { dayToIso } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { PaymentClass, Person } from "@/lib/types";

type Step = "choose" | "payment" | "expense";

function nowInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function MoneyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction, updateTransaction, addCategory, renameCategory, deleteCategory, addSupplier } = useStore();
  const presetProject = params.get("projectId") || "";
  const kindParam = params.get("kind");
  const txId = params.get("tx") || "";
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
  const [supplierPick, setSupplierPick] = useState(false);
  const [newSupplier, setNewSupplier] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [attachSheet, setAttachSheet] = useState(false);
  const [galleryPick, setGalleryPick] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const project = state.projects.find((item) => item.id === projectId);
  const existing = state.transactions.find((item) => item.id === txId);
  const selectedSupplier = state.suppliers.find((item) => item.id === supplierId);

  useEffect(() => {
    if (!existing) return;
    setProjectId(existing.projectId);
    setAmount(String(existing.amount));
    setItem(existing.notes || "");
    setPrivateNotes(existing.privateNotes || "");
    setTransport(existing.transportAmount ? String(existing.transportAmount) : "");
    setStorage(existing.storageAmount ? String(existing.storageAmount) : "");
    setCategoryId(existing.categoryId || "");
    setSupplierId(existing.supplierId || "");
    setPaymentClass(existing.paymentClass || "expense");
    setAttachment(existing.attachmentDataUrl);
    const date = new Date(existing.date);
    if (!Number.isNaN(date.getTime())) {
      const pad = (value: number) => String(value).padStart(2, "0");
      setBoughtAt(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
    }
  }, [existing]);
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
    const payload = {
      projectId,
      type: "client_payment" as const,
      amount: Number(amount),
      date: dayToIso(boughtAt),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      paymentClass,
      attachmentDataUrl: attachment,
    };
    if (txId) updateTransaction(txId, payload);
    else addTransaction(payload);
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
    const payload = {
      projectId,
      type: "expense" as const,
      amount: materials,
      transportAmount,
      storageAmount,
      date: dayToIso(boughtAt),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      categoryId,
      expenseKind: "purchase" as const,
      attachmentDataUrl: attachment,
      supplierId: supplierId || undefined,
    };
    if (txId) updateTransaction(txId, payload);
    else addTransaction(payload);
    setConfirmOpen(false);
    router.push(financeHref());
  }

  function trySavePurchase() {
    const materials = Number(amount);
    const transportAmount = Number(transport) || 0;
    const storageAmount = Number(storage) || 0;
    if (!projectId || !categoryId || materials <= 0 || !item.trim()) return;
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
              الوصف <span className="text-rose-600">مطلوب</span>
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

            <div>
              <p className="mb-1 text-sm font-semibold">
                المورد <span className="font-normal text-stone-400">اختياري</span>
              </p>
              <button
                type="button"
                className="input flex w-full items-center justify-between text-right"
                onClick={() => {
                  setSupplierQuery("");
                  setSupplierPick(true);
                }}
              >
                <span className={selectedSupplier ? "font-bold" : "text-stone-400"}>
                  {selectedSupplier?.name || "بدون مورد"}
                </span>
                <span className="text-stone-400">▾</span>
              </button>
            </div>

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

          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <button type="submit" className="btn btn-primary" disabled={busy || !categoryId || !item.trim()}>
              تسجيل الشراء
            </button>
            <Link href={backHref} className="btn btn-secondary text-center">
              إلغاء
            </Link>
          </div>
        </form>

        {manageCats ? (
          <CategoryManager
            categories={state.categories}
            useCount={(id) => state.transactions.filter((tx) => tx.categoryId === id).length}
            newName={newCatName}
            drafts={renameDrafts}
            onNewName={setNewCatName}
            onDraft={(id, value) => setRenameDrafts((prev) => ({ ...prev, [id]: value }))}
            onAdd={() => {
              if (!newCatName.trim()) return;
              const id = addCategory(newCatName);
              setCategoryId(id);
              setNewCatName("");
            }}
            onAddAll={(names) => {
              names.forEach((name) => addCategory(name));
            }}
            onRename={(id) => renameCategory(id, renameDrafts[id] ?? "")}
            onDelete={deleteCategory}
            onClose={() => setManageCats(false)}
          />
        ) : null}

        {supplierPick && !newSupplier ? (
          <SupplierPicker
            query={supplierQuery}
            onQuery={setSupplierQuery}
            suppliers={state.suppliers}
            selectedId={supplierId}
            onPick={(id) => {
              setSupplierId(id);
              setSupplierPick(false);
            }}
            onAdd={() => setNewSupplier(true)}
            onClose={() => setSupplierPick(false)}
          />
        ) : null}

        {newSupplier ? (
          <NewSupplierForm
            categories={state.categories.map((item) => item.name)}
            onManageCategories={() => {
              setRenameDrafts(Object.fromEntries(state.categories.map((c) => [c.id, c.name])));
              setManageCats(true);
            }}
            onCancel={() => setNewSupplier(false)}
            onSave={(input) => {
              const id = addSupplier(input);
              setSupplierId(id);
              setNewSupplier(false);
              setSupplierPick(false);
            }}
          />
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
            {txId
              ? "التصنيف ده بيتفعّل بس مع مشاريع الإشراف الثابت."
              : hasSupervision
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

const SUGGESTED_CATEGORIES = [
  "حديد",
  "أسمنت",
  "رمل",
  "سباكة",
  "أدوات صحية",
  "كهرباء",
  "إنارة",
  "دهانات",
  "أخشاب",
  "موبيليا",
  "رخام",
];

function CategoryManager({
  categories,
  useCount,
  newName,
  drafts,
  onNewName,
  onDraft,
  onAdd,
  onAddAll,
  onRename,
  onDelete,
  onClose,
}: {
  categories: { id: string; name: string }[];
  useCount: (id: string) => number;
  newName: string;
  drafts: Record<string, string>;
  onNewName: (value: string) => void;
  onDraft: (id: string, value: string) => void;
  onAdd: () => void;
  onAddAll: (names: string[]) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState("");
  const available = SUGGESTED_CATEGORIES.filter((name) => !categories.some((item) => item.name === name));
  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-[var(--bg)]">
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-6">
        <h2 className="mb-4 text-center text-lg font-black">إدارة البنود</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="عزل"
            aria-label="إضافة بند جديد"
            value={newName}
            onChange={(event) => onNewName(event.target.value)}
          />
          <button type="button" className="btn btn-primary shrink-0" onClick={onAdd}>إضافة</button>
        </div>
        {categories.length === 0 ? (
          <p className="card mt-4 text-center text-stone-500">لا توجد بنود بعد</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {categories.map((category) => {
              const count = useCount(category.id);
              const editing = editingId === category.id;
              return (
                <li key={category.id} className="card">
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        value={drafts[category.id] ?? category.name}
                        onChange={(event) => onDraft(category.id, event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary shrink-0"
                        onClick={() => {
                          onRename(category.id);
                          setEditingId("");
                        }}
                      >
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{category.name}</p>
                        <p className="text-xs text-stone-500">
                          {count === 0 ? "لا توجد ارتباطات" : `${count.toLocaleString("ar-EG")} ارتباط`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => {
                          onDraft(category.id, category.name);
                          setEditingId(category.id);
                        }}>
                          تعديل
                        </button>
                        <button type="button" className="text-sm font-bold text-rose-700" onClick={() => onDelete(category.id)}>
                          حذف
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between">
          <p className="font-black">اقتراحات سريعة</p>
          <p className="text-xs text-stone-500">{available.length.toLocaleString("ar-EG")} متاحة</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {available.map((name) => (
            <button
              key={name}
              type="button"
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold"
              onClick={() => onAddAll([name])}
            >
              + {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary mt-3 w-full"
          disabled={available.length === 0}
          onClick={() => onAddAll(available)}
        >
          إضافة الكل
        </button>
        <button type="button" className="btn btn-primary mt-3 w-full" onClick={onClose}>تم</button>
      </div>
    </div>
  );
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function SupplierPicker({
  query,
  onQuery,
  suppliers,
  selectedId,
  onPick,
  onAdd,
  onClose,
}: {
  query: string;
  onQuery: (value: string) => void;
  suppliers: Person[];
  selectedId: string;
  onPick: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const visible = suppliers.filter((person) => {
    const needle = query.trim();
    if (!needle) return true;
    return [person.name, person.phone || "", person.email || ""].join(" ").includes(needle);
  });
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-3xl bg-[var(--bg)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="text-sm font-bold text-stone-500" onClick={onClose}>
            رجوع
          </button>
          <p className="font-black">اختر المورد</p>
          <span className="w-10" />
        </div>
        <input
          className="input mb-3"
          placeholder="بحث بالاسم أو الهاتف..."
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <button
          type="button"
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-right"
          onClick={onAdd}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-xl text-white">+</span>
          <span className="font-bold text-[var(--brand)]">إضافة مورد جديد</span>
        </button>
        <button
          type="button"
          className={`card mb-2 flex w-full items-center justify-between ${selectedId === "" ? "border-[var(--brand)] bg-[#f3e6dc]" : ""}`}
          onClick={() => onPick("")}
        >
          <span
            className={`h-5 w-5 rounded-full border ${selectedId === "" ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"}`}
          />
          <span className="font-bold">بدون مورد</span>
        </button>
        {visible.length === 0 ? <p className="card text-center text-stone-500">لا يوجد موردين</p> : null}
        {visible.map((person) => (
          <button
            key={person.id}
            type="button"
            className={`card mb-2 flex w-full items-center justify-between gap-3 text-right ${
              selectedId === person.id ? "border-[var(--brand)] bg-[#f3e6dc]" : ""
            }`}
            onClick={() => onPick(person.id)}
          >
            <span
              className={`h-5 w-5 shrink-0 rounded-full border ${
                selectedId === person.id ? "border-[var(--brand)] bg-[var(--brand)]" : "border-stone-300"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{person.name}</span>
              {person.phone ? (
                <span className="mt-1 block text-sm text-stone-500" dir="ltr">
                  {person.phone}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NewSupplierForm({
  categories,
  onManageCategories,
  onCancel,
  onSave,
}: {
  categories: string[];
  onManageCategories: () => void;
  onCancel: () => void;
  onSave: (input: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
    specialties?: string[];
    attachmentDataUrl?: string;
  }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [attachment, setAttachment] = useState("");
  const [notice, setNotice] = useState("");
  const available = categories.filter((item) => !specialties.includes(item));

  async function fromContacts() {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
      };
    };
    if (!nav.contacts?.select) return;
    try {
      const picked = await nav.contacts.select(["name", "tel", "email"], { multiple: false });
      const first = picked[0];
      if (!first) return;
      if (first.name?.[0]) setName(first.name[0]);
      if (first.tel?.[0]) {
        const digits = digitsOnly(first.tel[0]);
        setPhone(digits.startsWith("20") ? digits.slice(2) : digits);
      }
      if (first.email?.[0]) setEmail(first.email[0]);
    } catch {
      return;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب اسم المورد");
      return;
    }
    if (!digitsOnly(phone)) {
      setNotice("اكتب الهاتف");
      return;
    }
    onSave({
      name,
      phone: `+20 ${digitsOnly(phone)}`,
      email,
      notes,
      specialties,
      attachmentDataUrl: attachment || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-auto bg-[var(--bg)]">
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="text-sm font-bold text-stone-500" onClick={onCancel}>
            رجوع
          </button>
          <p className="font-black">مورد جديد</p>
          <span className="w-10" />
        </div>
        <form onSubmit={submit} className="space-y-3" noValidate>
          {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
          <button type="button" className="btn btn-secondary w-full" onClick={() => void fromContacts()}>
            استيراد من جهات الاتصال
          </button>
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-sm font-bold">
              <span>اسم المورد</span>
              <span className="font-normal text-stone-400">مطلوب</span>
            </span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="space-y-1">
            <span className="flex items-center justify-between text-sm font-bold">
              <span>الهاتف</span>
              <span className="font-normal text-stone-400">مطلوب</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
              <input
                className="input min-w-0 flex-1"
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(digitsOnly(event.target.value))}
              />
            </div>
          </div>
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-sm font-bold">
              <span>البريد</span>
              <span className="font-normal text-stone-400">اختياري</span>
            </span>
            <input
              className="input"
              dir="ltr"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-1 items-center justify-between text-sm font-bold">
                <span>البنود التي يوردها</span>
                <span className="font-normal text-stone-400">اختياري</span>
              </span>
              <button type="button" className="shrink-0 text-sm font-bold text-[var(--brand)]" onClick={onManageCategories}>
                إدارة البنود
              </button>
            </div>
            {categories.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-sm text-stone-500">
                لا توجد بنود
              </p>
            ) : (
              <>
                {available.length > 0 ? (
                  <select
                    className="input"
                    value=""
                    aria-label="البنود التي يوردها"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value || specialties.includes(value)) return;
                      setSpecialties((prev) => [...prev, value]);
                    }}
                  >
                    <option value="">اختار بند</option>
                    {available.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : null}
                {specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold"
                        onClick={() => setSpecialties((prev) => prev.filter((name) => name !== item))}
                      >
                        {item} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-sm font-bold">
              <span>ملاحظات</span>
              <span className="font-normal text-stone-400">اختياري</span>
            </span>
            <textarea className="input min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="space-y-2">
            <span className="flex items-center justify-between text-sm font-bold">
              <span>المرفق</span>
              <span className="font-normal text-stone-400">اختياري</span>
            </span>
            <button type="button" className="card w-full text-sm text-stone-500" onClick={() => fileRef.current?.click()}>
              اضغط لالتقاط أو رفع ملف
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAttachment(String(reader.result || ""));
                reader.readAsDataURL(file);
              }}
            />
            {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
          </div>
          <button type="submit" className="btn btn-primary w-full">
            حفظ المورد
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={onCancel}>
            إلغاء
          </button>
        </form>
      </div>
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
