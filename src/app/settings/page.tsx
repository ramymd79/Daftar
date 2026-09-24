"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DEMO_PASSWORD } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { state, lock, resetDemo, addCategory } = useStore();
  const [name, setName] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name);
    setName("");
  }

  return (
    <AppShell title="الإعدادات">
      <div className="space-y-3">
        <div className="card space-y-2 text-sm">
          <p className="text-lg font-bold">دفتر</p>
          <p className="text-stone-600">
            البيانات متسجلة على الجهاز ده بس، في المتصفح.
          </p>
          <p className="text-stone-500">
            كلمة سر التجربة: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <form onSubmit={onAdd} className="card space-y-3">
          <p className="font-bold">فئات المصروف</p>
          <ul className="flex flex-wrap gap-2">
            {state.categories.map((category) => (
              <li
                key={category.id}
                className="rounded-full bg-stone-100 px-3 py-1 text-sm"
              >
                {category.name}
              </li>
            ))}
          </ul>
          <input
            className="input"
            placeholder="فئة جديدة، مثلاً: جبس"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary w-full">
            إضافة الفئة
          </button>
        </form>

        <div className="card space-y-2">
          <p className="font-bold">الفريق</p>
          <p className="text-sm text-stone-600">دعوة الشريك وصلاحياته لسه مش شغالة.</p>
          <button type="button" disabled aria-disabled="true" className="btn btn-secondary w-full opacity-60">
            إرسال الدعوة · لسه مش شغالة
          </button>
        </div>

        <div className="card space-y-2">
          <p className="font-bold">ربح المكتب</p>
          <p className="text-sm text-stone-600">الرقم لسه مش ظاهر، لأن مكانه في الشاشة لسه من غير لقطة.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => {
            if (window.confirm("ترجع بيانات التجربة وتحذف اللي ضفته على الجهاز؟")) {
              resetDemo();
            }
          }}
        >
          إعادة بيانات التجربة
        </button>

        <button type="button" className="btn btn-primary w-full" onClick={() => lock()}>
          تسجيل الخروج
        </button>
      </div>
    </AppShell>
  );
}
