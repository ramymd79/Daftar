"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PeopleDirectory } from "@/components/PeopleDirectory";

function SuppliersInner() {
  const params = useSearchParams();
  return <PeopleDirectory kind="suppliers" title="الموردون" initialId={params.get("id") || ""} />;
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">جاري التحميل…</p>}>
      <SuppliersInner />
    </Suspense>
  );
}
