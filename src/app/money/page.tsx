"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { dayToIso } from "@/lib/money";
import { useStore } from "@/lib/store";

type Step = "choose" | "payment" | "expense";

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function MoneyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction } = useStore();
  const presetProject = params.get("projectId") || "";
  const [step, setStep] = useState<Step>("choose");
  const [projectId, setProjectId] = useState(
    presetProject || state.projects[0]?.id || "",
  );
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [date, setDate] = useState(todayInput);
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id || "");
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
    if (type === "expense" && (!item.trim() || !categoryId)) return;
    addTransaction({
      projectId,
      type,
      amount: Number(amount),
      date: dayToIso(date),
      notes: item.trim() || undefined,
      categoryId: type === "expense" ? categoryId : undefined,
      attachmentDataUrl: attachment,
      contractorId: type === "expense" && contractorId ? contractorId : undefined,
      supplierId: type === "expense" && supplierId ? supplierId : undefined,
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
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-6">
        <p className="text-sm font-bold text-[var(--brand)]">دفتر</p>
        <h1 className="mt-3 text-2xl font-black">عايز تسجل إيه؟</h1>
        {project ? (
          <p className="mt-2 text-sm text-stone-500">{project.name}</p>
        ) : null}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="card w-full text-right text-lg font-bold"
            onClick={() => setStep("payment")}
          >
            استلمت فلوس من العميل
          </button>
          <button
            type="button"
            className="card w-full text-right text-lg font-bold"
            onClick={() => setStep("expense")}
          >
            صرفت فلوس في الموقع
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
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-10">
      <button
        type="button"
        className="mb-3 text-sm text-stone-500"
        onClick={() => setStep("choose")}
      >
        رجوع
      </button>
      <h1 className="mb-1 text-xl font-black">
        {isPayment ? "دفعة من العميل" : "مصروف للموقع"}
      </h1>
      {project ? <p className="mb-4 text-sm text-stone-500">{project.name}</p> : null}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save(isPayment ? "client_payment" : "expense");
        }}
        className="space-y-3"
      >
        {presetProject ? null : (
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
          المبلغ
          <input
            className="input mt-1"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="اكتب المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </label>

        {isPayment ? (
          <label className="block text-sm font-semibold">
            البيان <span className="font-normal text-stone-400">اختياري</span>
            <input
              className="input mt-1"
              placeholder="مثلاً: دفعة تحت الحساب"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </label>
        ) : (
          <>
            <label className="block text-sm font-semibold">
              البند
              <input
                className="input mt-1"
                placeholder="مثلاً: بلاط صالة أو أجرة نقاشة"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              الفئة
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
            <label className="block text-sm font-semibold">
              مقاول <span className="font-normal text-stone-400">اختياري</span>
              <select
                className="input mt-1"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">من غير مقاول</option>
                {state.contractors.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              مورد <span className="font-normal text-stone-400">اختياري</span>
              <select
                className="input mt-1"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">من غير مورد</option>
                {state.suppliers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

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
            المرفق <span className="font-normal text-stone-400">اختياري</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-600">
            {busy
              ? "بيتحفظ المرفق…"
              : attachment
                ? "الصورة اتضافت — اضغط لو عايز تغيّرها"
                : "صورة الفاتورة أو التحويل"}
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

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {isPayment ? "حفظ الدفعة" : "حفظ المصروف"}
        </button>
        <Link href={backHref} className="btn btn-secondary w-full">
          إلغاء
        </Link>
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
