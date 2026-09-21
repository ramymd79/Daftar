"use client";

import { AppShell } from "@/components/AppShell";
import { DEMO_PASSWORD } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { lock, resetDemo } = useStore();

  return (
    <AppShell title="الإعدادات">
      <div className="space-y-3">
        <div className="card space-y-2 text-sm">
          <p className="font-bold text-lg">دفتر</p>
          <p className="text-stone-600">
            تجربة محلية على المتصفح. البيانات محفوظة في LocalStorage على جهازك
            فقط.
          </p>
          <p className="text-stone-500">
            كلمة سر التجربة: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={() => {
            if (
              window.confirm(
                "هترجع بيانات التجربة الأصلية وتحذف اللي ضفتَه محليًا. متأكد؟",
              )
            ) {
              resetDemo();
            }
          }}
        >
          إعادة بيانات التجربة
        </button>

        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => lock()}
        >
          تسجيل الخروج
        </button>
      </div>
    </AppShell>
  );
}
