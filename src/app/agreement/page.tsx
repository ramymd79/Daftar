"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { readCompressedImage } from "@/lib/images";
import { parseUserNumber } from "@/lib/money";
import { useStore } from "@/lib/store";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function AgreementInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, addAgreement, addContractor } = useStore();
  const projectId = params.get("projectId") || "";
  const project = state.projects.find((item) => item.id === projectId);
  const [contractorId, setContractorId] = useState("");
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backHref = project
    ? `/project/?id=${encodeURIComponent(project.id)}&tab=contractors`
    : "/projects/";

  if (!project) {
    return (
      <AppShell title="إضافة مقاول للمشروع">
        <p className="card">اختار المشروع الأول.</p>
        <Link href="/projects/" className="btn btn-secondary mt-3 inline-flex">
          المشاريع
        </Link>
      </AppShell>
    );
  }

  if (creating) {
    return (
      <NewContractorForm
        onCancel={() => setCreating(false)}
        onCreated={(id) => {
          setContractorId(id);
          setCreating(false);
        }}
      />
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!project) return;
    if (!contractorId) {
      setNotice("اختار المقاول");
      return;
    }
    addAgreement({
      projectId: project.id,
      contractorId,
      amount: parseUserNumber(amount) || 0,
      notes,
      attachmentDataUrl: attachment || undefined,
    });
    router.push(backHref);
  }

  return (
    <AppShell title="إضافة مقاول للمشروع">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>المشروع</span>
            <span className="font-normal text-stone-400">متقفل</span>
          </span>
          <input className="input" value={project.name} disabled />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>المقاول</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <select
            className="input"
            value={contractorId}
            aria-label="المقاول"
            onChange={(event) => {
              setContractorId(event.target.value);
              setNotice("");
            }}
          >
            <option value="">اختار المقاول...</option>
            {state.contractors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setCreating(true)}>
            إضافة مقاول جديد
          </button>
        </div>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>المبلغ المتفق عليه</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="أدخل المبلغ"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>ملاحظات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <textarea
            className="input min-h-24"
            placeholder="ملاحظات خاصة بهذا المشروع"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>المرفقات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <button type="button" className="card w-full text-sm text-stone-500" onClick={() => fileRef.current?.click()}>
            {attachment ? "المرفق اتضاف" : "اضغط لالتقاط أو رفع ملف"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.type.startsWith("image/")) setAttachment(await readCompressedImage(file));
              else {
                const reader = new FileReader();
                reader.onload = () => setAttachment(String(reader.result || ""));
                reader.readAsDataURL(file);
              }
            }}
          />
          {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          إضافة للمشروع
        </button>
        <Link href={backHref} className="btn btn-secondary w-full">
          إلغاء
        </Link>
      </form>
    </AppShell>
  );
}

function NewContractorForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const { state, addContractor } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraPhone, setExtraPhone] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState("");
  const [notice, setNotice] = useState("");
  const available = state.categories.map((item) => item.name).filter((item) => !specialties.includes(item));

  async function fromContacts() {
    const nav = navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts: { multiple: boolean },
        ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
      };
    };
    if (!nav.contacts?.select) return;
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: false });
      const first = picked[0];
      if (!first) return;
      if (first.name?.[0]) setName(first.name[0]);
      if (first.tel?.[0]) {
        const digits = digitsOnly(first.tel[0]);
        setPhone(digits.startsWith("20") ? digits.slice(2) : digits);
      }
    } catch {
      return;
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNotice("اكتب اسم المقاول");
      return;
    }
    if (!digitsOnly(phone)) {
      setNotice("اكتب الهاتف");
      return;
    }
    if (!specialties.length) {
      setNotice("اختار بند");
      return;
    }
    const id = addContractor({
      name,
      phone: `+20 ${digitsOnly(phone)}`,
      extraPhone: extraOpen && digitsOnly(extraPhone) ? `+20 ${digitsOnly(extraPhone)}` : undefined,
      notes,
      specialties,
      attachmentDataUrl: attachment || undefined,
    });
    onCreated(id);
  }

  return (
    <AppShell title="مقاول جديد">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {notice ? <p className="text-sm font-bold text-rose-700">{notice}</p> : null}
        <button type="button" className="btn btn-secondary w-full" onClick={() => void fromContacts()}>
          تحديث من جهة اتصال
        </button>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>اسم المقاول</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>الهاتف الأساسي</span>
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
        {extraOpen ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold">مصر +20</span>
            <input
              className="input min-w-0 flex-1"
              dir="ltr"
              inputMode="tel"
              aria-label="رقم هاتف آخر"
              value={extraPhone}
              onChange={(event) => setExtraPhone(digitsOnly(event.target.value))}
            />
          </div>
        ) : (
          <button type="button" className="text-sm font-bold text-[var(--brand)]" onClick={() => setExtraOpen(true)}>
            إضافة رقم هاتف آخر
          </button>
        )}
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>البنود</span>
            <span className="font-normal text-stone-400">مطلوب</span>
          </span>
          {available.length > 0 ? (
            <select
              className="input"
              value=""
              aria-label="البنود"
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
        </div>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>ملاحظات</span>
            <span className="font-normal text-stone-400">اختياري</span>
          </span>
          <textarea
            className="input min-h-24"
            placeholder="ملاحظات تشغيلية تظهر في ملف المقاول..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="space-y-2">
          <span className="flex items-center justify-between text-sm font-bold">
            <span>مرفقات المقاول</span>
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
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.type.startsWith("image/")) setAttachment(await readCompressedImage(file));
              else {
                const reader = new FileReader();
                reader.onload = () => setAttachment(String(reader.result || ""));
                reader.readAsDataURL(file);
              }
            }}
          />
          {attachment.startsWith("data:image") ? <img src={attachment} alt="" className="max-h-40 rounded-xl" /> : null}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          حفظ المقاول
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={onCancel}>
          إلغاء
        </button>
      </form>
    </AppShell>
  );
}

export default function AgreementPage() {
  return (
    <Suspense fallback={<div className="p-6">جاري التحميل…</div>}>
      <AgreementInner />
    </Suspense>
  );
}
