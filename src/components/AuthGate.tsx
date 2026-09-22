"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, state } = useStore();
  const router = useRouter();
  const pathname = usePathname() || "";
  const isLogin = pathname === "/" || pathname === "";
  const isGuide = pathname === "/guide" || pathname.startsWith("/guide/");

  useEffect(() => {
    if (!ready) return;
    if (!state.unlocked && !isLogin && !isGuide) {
      router.replace("/");
    }
    if (state.unlocked && isLogin) {
      router.replace("/projects/");
    }
  }, [ready, state.unlocked, isLogin, isGuide, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-stone-500">
        جاري التحميل…
      </div>
    );
  }

  return <>{children}</>;
}
