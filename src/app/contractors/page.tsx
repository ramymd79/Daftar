"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PeopleDirectory } from "@/components/PeopleDirectory";

function ContractorsInner() {
  const params = useSearchParams();
  return <PeopleDirectory kind="contractors" title="المقاولون" initialId={params.get("id") || ""} />;
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-stone-500">جاري التحميل…</p>}>
      <ContractorsInner />
    </Suspense>
  );
}
