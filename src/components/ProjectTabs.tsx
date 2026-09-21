"use client";

import Link from "next/link";

const tabs = [
  { key: "finance", label: "مالية" },
  { key: "contractors", label: "مقاولون" },
  { key: "suppliers", label: "موردون" },
  { key: "gallery", label: "معرض" },
  { key: "settings", label: "إعدادات" },
] as const;

export type ProjectTab = (typeof tabs)[number]["key"];

export function ProjectTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: ProjectTab;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
      {tabs.map((tab) => {
        const href = `/project/?id=${encodeURIComponent(projectId)}&tab=${tab.key}`;
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm ${
              isActive
                ? "bg-white font-bold text-[var(--brand)] border border-b-white border-stone-200"
                : "text-stone-500"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
