"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { dayToIso } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { PaymentClass } from "@/lib/types";

type Step = "choose" | "payment" | "expense";

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function nowInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function MoneyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction } = useStore();
  const presetProject = params.get("projectId") || "";
  const [step, setStep] = useState<Step>("choose");
  const [projectId, setProjectId] = useState(presetProject || state.projects[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [date, setDate] = useState(todayInput);
  const [boughtAt, setBoughtAt] = useState(nowInput);
  const [categoryId, setCategoryId] = useState("");
  const [paymentClass, setPaymentClass] = useState<PaymentClass>("expense");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState("");
  const [transport, setTransport] = useState("");
  const [storage, setStorage] = useState("");
  const [busy, setBusy] = useState(false);

  const project = state.projects.find((item) => item.id === projectId);
  const backHref = projectId
    ? `/project/?id=${encodeURIComponent(projectId)}`
    : "/projects/";

  function savePayment() {
    if (!projectId || Number(amount) <= 0) return;
    addTransaction({
      projectId,
      type: "client_payment",
      amount: Number(amount),
      date: dayToIso(date),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      paymentClass,
      attachmentDataUrl: attachment,
    });
    router.push(`/project/?id=${encodeURIComponent(projectId)}&tab=finance`);
  }

  function savePurchase() {
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
    router.push(`/project/?id=${encodeURIComponent(projectId)}&tab=finance`);
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
    }
  }

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
          <button type="button" className="text-sm text-stone-500" onClick={() => setStep("choose")}>
            ←
          </button>
          <h1 className="text-lg font-black">تسجيل شراء مواد</h1>
          <span className="w-6" />
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            savePurchase();
          }}
          className="flex flex-1 flex-col px-4 py-4"
        >
          <div className="space-y-3">
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

            <label className="block text-sm font-semibold">
              الوصف <span className="font-normal text-stone-400">اختياري</span>
              <input
                className="input mt-1"
                placeholder="وصف المواد المشتراة"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
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
              <label className="block text-sm font-semibold">
                البند <span className="text-rose-600">مطلوب</span>
                <select
                  className="input mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">اختر البند...</option>
                  {state.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
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
              المورد <span className="font-normal text-stone-400">اختياري</span>
              <select
                className="input mt-1"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">اختياري</option>
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
            <Link href={backHref} className="grid h-12 w-12 place-items-center rounded-full border border-stone-300 bg-white text-xl" aria-label="إلغاء">
              ×
            </Link>
            <button
              type="submit"
              className="grid h-14 w-14 place-items-center rounded-full bg-sky-600 text-2xl text-white disabled:opacity-50"
              disabled={busy}
              aria-label="حفظ"
            >
              ✓
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] px-4 py-6 pb-10">
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={() => setStep("choose")}>
        رجوع
      </button>
      <h1 className="mb-4 text-xl font-black">تسجيل مدفوعات من العميل</h1>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          savePayment();
        }}
        className="space-y-3"
      >
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
            الدفعة من المصروفات بتزوّد المستلم. الدفعة من نسبة الإشراف بتزوّد خانة الإشراف وبس.
          </p>
        </div>

        <label className="block text-sm font-semibold">
          البيان <span className="font-normal text-stone-400">يظهر للعميل</span>
          <input
            className="input mt-1"
            placeholder="مثلاً: دفعة تحت الحساب"
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

        <label className="block text-sm font-semibold">
          التاريخ
          <input
            className="input mt-1"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <div>
          <p className="mb-1 text-sm font-semibold">
            المرفقات <span className="font-normal text-stone-400">اختياري</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-600">
            {busy ? "بيتحفظ المرفق…" : attachment ? "الصورة اتضافت" : "صورة الفاتورة أو التحويل"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
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
