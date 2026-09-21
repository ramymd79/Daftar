import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/BottomNav";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "دفتر | Daftar",
  description: "دفتر فلوس مشاريع التشطيب — مدفوعات ومصروفات وصور في مكان واحد",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full bg-[var(--bg)] font-sans text-stone-900 antialiased">
        <StoreProvider>
          <AuthGate>
            {children}
            <BottomNav />
          </AuthGate>
        </StoreProvider>
      </body>
    </html>
  );
}
