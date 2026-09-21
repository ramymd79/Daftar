"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readCompressedImage } from "@/lib/images";
import { useStore } from "@/lib/store";

function AgreementInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addAgreement, addContractor } = useStore();
  const projectId = params.get("projectId") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const [contractorId, setContractorId] = useState("");
  const [newName, setNewName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<string | undefined>();

  if (!project) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="card">اختار المشروع الأول.</p>
        <Link href="/projects/" className="btn btn-secondary mt-3 inline-flex">
          المشاريع
        </Link>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project || Number(amount) <= 0) return;
    let cid = contractorId;
    if (!cid && newName.trim()) cid = addContractor({ name: newName });
    if (!cid) return;
    addAgreement({
      projectId: project.id,
      contractorId: cid,
      amount: Number(amount),
      notes,
      attachmentDataUrl: attachment,
    });
    router.push(`/project/?id=${encodeURIComponent(project.id)}&tab=contractors`);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)] px-4 py-8">
      <p className="text-center text-sm font-bold text-[var(--brand)]">دفتر</p>
      <h1 className="mt-6 text-center text-2xl font-black leading-snug">
        اتفقت مع مقاول على المشروع؟
      </h1>
      <p className="mt-2 text-center text-sm text-stone-600">سجّل الاتفاق ع المشروع</p>
      <p className="mt-1 text-center text-sm text-stone-500">{project.name}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm font-semibold">
          المقاول
          <select
            className="input mt-1"
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
          >
            <option value="">مقاول جديد</option>
            {state.contractors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        {!contractorId ? (
          <input
            className="input"
            placeholder="اسم المقاول"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
        ) : null}
        <label className="block text-sm font-semibold">
          المبلغ المتفق عليه
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
          ملاحظات <span className="font-normal text-stone-400">اختياري</span>
          <textarea
            className="input mt-1 min-h-24"
            placeholder="ملاحظات خاصة بهذا المشروع"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div>
          <p className="mb-1 text-sm font-semibold">
            المرفقات <span className="font-normal text-stone-400">اختياري</span>
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-600">
            {attachment ? "الصورة اتضافت" : "صورة الاتفاق"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAttachment(await readCompressedImage(file));
              }}
            />
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-full">
          حفظ الاتفاق
        </button>
        <Link
          href={`/project/?id=${encodeURIComponent(project.id)}&tab=contractors`}
          className="btn btn-secondary w-full"
        >
          إلغاء
        </Link>
      </form>
    </div>
  );
}

export default function AgreementPage() {
  return (
    <Suspense fallback={<div className="p-6">جاري التحميل…</div>}>
      <AgreementInner />
    </Suspense>
  );
}
