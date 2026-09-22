"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { expenseBreakdown, expensesForPerson } from "@/lib/logic";
import { dayToIso, formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";

function nowInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function PaymentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addTransaction } = useStore();
  const presetProject = params.get("projectId") || state.projects[0]?.id || "";
  const [projectId, setProjectId] = useState(presetProject);
  const [contractorId, setContractorId] = useState(params.get("contractorId") || "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(nowInput);
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const project = state.projects.find((item) => item.id === projectId);
  const backHref = projectId
    ? `/project/?id=${encodeURIComponent(projectId)}&tab=contractors`
    : "/projects/";

  const agreed = (state.agreements || [])
    .filter((item) => item.projectId === projectId && item.contractorId === contractorId)
    .reduce((sum, item) => sum + item.amount, 0);
  const paid = contractorId
    ? expensesForPerson(state, "contractorId", contractorId, projectId).reduce(
        (sum, tx) => sum + expenseBreakdown(tx).total,
        0,
      )
    : 0;
  const left = agreed - paid;

  async function onFile(file?: File) {
    if (!file) return;
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !contractorId || !categoryId || Number(amount) <= 0) return;
    const category = state.categories.find((item) => item.id === categoryId);
    addTransaction({
      projectId,
      type: "expense",
      expenseKind: "labor",
      contractorId,
      categoryId,
      amount: Number(amount),
      date: dayToIso(paidAt),
      notes: notes.trim() || category?.name || "مصنعية",
      attachmentDataUrl: attachment,
    });
    router.push(backHref);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] px-4 py-6 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href={backHref} className="text-sm font-bold text-stone-500">
          رجوع
        </Link>
        <h1 className="text-lg font-black">تسجيل مدفوعات مقاول</h1>
        <span className="w-10" />
      </div>
      <p className="mb-4 text-sm text-stone-600">سجل مدفوعات لمقاول مسؤول عن أعمال في المشروع.</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-semibold">
          المشروع <span className="text-rose-600">مطلوب</span>
          <select
            className="input mt-1"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setContractorId("");
            }}
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
          المقاول <span className="text-rose-600">مطلوب</span>
          <select
            className="input mt-1"
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
            required
          >
            <option value="">اختر المقاول</option>
            {state.contractors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <section className="card">
          <p className="mb-3 text-center text-sm font-bold">ملخص المدفوعات</p>
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-xs text-stone-500">المتبقي</p>
              <p className={`font-black ${left < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {contractorId ? formatMoney(left) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">المتفق عليه</p>
              <p className="font-black">{contractorId ? formatMoney(agreed) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">تم دفع</p>
              <p className="font-black">{contractorId ? formatMoney(paid) : "—"}</p>
            </div>
          </div>
          {contractorId && agreed === 0 ? (
            <p className="mt-3 text-center text-xs text-stone-500">لسه مفيش اتفاق متسجل مع المقاول ده.</p>
          ) : null}
        </section>

        <label className="block text-sm font-semibold">
          البند <span className="text-rose-600">مطلوب</span>
          <select
            className="input mt-1"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">اختر البند</option>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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

        <label className="block text-sm font-semibold">
          التاريخ والوقت <span className="text-rose-600">مطلوب</span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          ملاحظات <span className="font-normal text-stone-400">اختياري</span>
          <textarea
            className="input mt-1 min-h-20"
            placeholder="ملاحظات إضافية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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

        <button type="submit" className="btn btn-primary w-full" disabled={busy || !project}>
          حفظ الدفعة
        </button>
      </form>
    </div>
  );
}

export default function ContractorPaymentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-stone-500">جاري التحميل…</div>}>
      <PaymentInner />
    </Suspense>
  );
}
