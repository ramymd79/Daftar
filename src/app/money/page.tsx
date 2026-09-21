"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";

type Step = "choose" | "payment" | "expense";

function MoneyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction } = useStore();
  const presetProject = params.get("projectId") || state.projects[0]?.id || "";
  const [step, setStep] = useState<Step>("choose");
  const [projectId, setProjectId] = useState(presetProject);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id || "");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [contractorId, setContractorId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const project = useMemo(
    () => state.projects.find((p) => p.id === projectId),
    [state.projects, projectId],
  );

  function savePayment(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !amount) return;
    addTransaction({
      projectId,
      type: "client_payment",
      amount: Number(amount),
      date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
      attachmentDataUrl: attachment,
    });
    router.push(`/project/?id=${encodeURIComponent(projectId)}`);
  }

  function saveExpense(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !amount || !categoryId) return;
    addTransaction({
      projectId,
      type: "expense",
      amount: Number(amount),
      date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
      categoryId,
      attachmentDataUrl: attachment,
      contractorId: contractorId || undefined,
      supplierId: supplierId || undefined,
    });
    router.push(`/project/?id=${encodeURIComponent(projectId)}`);
  }

  function onFile(file?: File | null) {
    if (!file) {
      setAttachment(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  if (step === "choose") {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-6">
        <div className="mb-6 text-center">
          <p className="text-sm font-bold text-[var(--brand)]">دفتر</p>
          <h1 className="mt-3 text-2xl font-black">حركة فلوس عايز تسجلها؟</h1>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            className="card w-full text-right text-lg font-bold"
            onClick={() => setStep("payment")}
          >
            استلمت من العميل؟
          </button>
          <button
            type="button"
            className="card w-full text-right text-lg font-bold"
            onClick={() => setStep("expense")}
          >
            اشتريت للموقع؟
          </button>
          <Link href="/projects/" className="btn btn-secondary w-full">
            رجوع
          </Link>
        </div>
      </div>
    );
  }

  const isPayment = step === "payment";

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-10">
      <button
        type="button"
        className="mb-3 text-sm text-stone-500"
        onClick={() => setStep("choose")}
      >
        رجوع
      </button>
      <h1 className="mb-4 text-xl font-black">
        {isPayment ? "تسجيل مدفوعات من العميل" : "تسجيل مصروف للموقع"}
      </h1>
      <form
        onSubmit={isPayment ? savePayment : saveExpense}
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
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        {!isPayment ? (
          <label className="block text-sm font-semibold">
            البند
            <select
              className="input mt-1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {state.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isPayment ? (
          <div className="grid grid-cols-1 gap-3">
            <label className="block text-sm font-semibold">
              مقاول (اختياري)
              <select
                className="input mt-1"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">—</option>
                {state.contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              مورد (اختياري)
              <select
                className="input mt-1"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">—</option>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <label className="block text-sm font-semibold">
          التاريخ والوقت <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          ملاحظات <span className="text-stone-400">اختياري</span>
          <textarea
            className="input mt-1 min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div>
          <p className="mb-1 text-sm font-semibold">
            الفواتير والمرفقات <span className="text-stone-400">اختياري</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-600">
            {attachment ? "تم إرفاق صورة — اضغط للتغيير" : "+ إضافة مرفق"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {attachment ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment}
              alt="مرفق"
              className="mt-2 h-24 w-24 rounded-xl object-cover"
            />
          ) : null}
        </div>

        {project ? (
          <p className="text-xs text-stone-500">المشروع الحالي: {project.name}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary flex-1">
            {isPayment ? "تسجيل المدفوعات" : "تسجيل المصروف"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
            إلغاء
          </button>
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
