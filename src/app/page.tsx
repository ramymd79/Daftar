"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PASSWORD } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { unlock, state } = useStore();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (unlock(password)) {
      router.replace("/projects/");
      return;
    }
    setError("كلمة السر غلط. جرّب كلمة تجربة العرض.");
  }

  if (state.unlocked) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--brand)] text-[var(--brand)]">
          <span className="text-2xl font-black">دفتر</span>
        </div>
        <h1 className="text-3xl font-black text-stone-900">دفتر</h1>
        <p className="mt-2 text-stone-600">
          دفتر فلوس مشاريع التشطيب — مدفوعات، مصروفات، وصور من الموقع.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-3">
        <label className="block text-sm font-semibold text-stone-700">
          كلمة سر التجربة
          <input
            className="input mt-1"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="اكتب كلمة السر"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full">
          دخول التجربة
        </button>
        <p className="text-center text-xs text-stone-500">
          كلمة السر: <span className="font-mono">{DEMO_PASSWORD}</span>
        </p>
      </form>
    </div>
  );
}
