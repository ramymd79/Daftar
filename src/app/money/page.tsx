"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { dayToIso } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ExpenseKind, PaymentClass } from "@/lib/types";

type Step = "choose" | "payment" | "expense";

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const kinds: { id: ExpenseKind; label: string }[] = [
  { id: "purchase", label: "مشتريات" },
  { id: "transport", label: "نقل وتخزين" },
  { id: "labor", label: "مقاولين" },
];

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
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id || "");
  const [paymentClass, setPaymentClass] = useState<PaymentClass>("expense");
  const [expenseKind, setExpenseKind] = useState<ExpenseKind>("purchase");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [contractorId, setContractorId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);

  const project = state.projects.find((item) => item.id === projectId);
  const backHref = projectId
    ? `/project/?id=${encodeURIComponent(projectId)}`
    : "/projects/";

  function save(type: "client_payment" | "expense") {
    if (!projectId || Number(amount) <= 0) return;
    addTransaction({
      projectId,
      type,
      amount: Number(amount),
      date: dayToIso(date),
      notes: item.trim() || undefined,
      privateNotes: privateNotes.trim() || undefined,
      categoryId: type === "expense" ? categoryId : undefined,
      paymentClass: type === "client_payment" ? paymentClass : undefined,
      expenseKind: type === "expense" ? expenseKind : undefined,
      attachmentDataUrl: attachment,
      contractorId: type === "expense" && expenseKind === "labor" && contractorId ? contractorId : undefined,
      supplierId:
        type === "expense" && expenseKind === "purchase" && supplierId ? supplierId : undefined,
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
      setAttachment(await readCompressedImage(file));
    } finally {
      setBusy(false);
    }
  }

  if (step === "choose") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[var(--bg)] px-5 py-10">
        <p className="text-center text-sm font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="mt-8 text-center text-3xl font-black leading-snug">
          حركة فلوس عايز تسجلها؟
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

  const isPayment = step === "payment";

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] px-4 py-6 pb-10">
      <button type="button" className="mb-3 text-sm text-stone-500" onClick={() => setStep("choose")}>
        رجوع
      </button>
      <h1 className="mb-4 text-xl font-black">
        {isPayment ? "تسجيل مدفوعات من العميل" : "تسجيل مصروف للموقع"}
      </h1>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save(isPayment ? "client_payment" : "expense");
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

        {isPayment ? (
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
              لو المشروع عليه نسبة إشراف، حدّد الدفعة دي بتغطي مصروف الموقع ولا نسبة الإشراف.
            </p>
          </div>
        ) : (
          <>
            <label className="block text-sm font-semibold">
              البند
              <select
                className="input mt-1"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {state.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">نوع المصروف</p>
              <div className="grid grid-cols-3 gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    className={`rounded-2xl border px-2 py-3 text-sm font-bold ${
                      expenseKind === kind.id
                        ? "border-[var(--brand)] bg-[#f3e6dc]"
                        : "border-stone-200 bg-white"
                    }`}
                    onClick={() => setExpenseKind(kind.id)}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
            </div>
            {expenseKind === "labor" ? (
              <label className="block text-sm font-semibold">
                المقاول
                <select
                  className="input mt-1"
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                >
                  <option value="">اختياري</option>
                  {state.contractors.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {expenseKind === "purchase" ? (
              <label className="block text-sm font-semibold">
                المورد
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
            ) : null}
          </>
        )}

        <label className="block text-sm font-semibold">
          البيان <span className="font-normal text-stone-400">يظهر للعميل</span>
          <input
            className="input mt-1"
            placeholder={isPayment ? "مثلاً: دفعة تحت الحساب" : "مثلاً: بلاط صالة"}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            required={!isPayment}
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
            {isPayment ? "تسجيل المدفوعات" : "تسجيل المصروف"}
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
