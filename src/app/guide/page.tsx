"use client";

import Link from "next/link";

const videoSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/guide.mp4`;

export default function GuidePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <Link href="/" className="text-sm font-bold text-[var(--brand)]">
        رجوع
      </Link>
      <h1 className="mt-4 text-2xl font-black text-stone-900">إزاي تستخدم دفتر</h1>
      <p className="mt-1 text-stone-600">دقيقة واحدة. كل خطوة على الشاشة، وبعدها ابدأ من المشاريع.</p>
      <video
        className="mt-4 w-full overflow-hidden rounded-2xl bg-stone-900"
        controls
        playsInline
        preload="metadata"
        src={videoSrc}
      >
        الفيديو مش ظاهر. افتحه من الرابط.
      </video>
    </div>
  );
}
