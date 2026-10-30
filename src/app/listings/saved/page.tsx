import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function SavedListingsPage() {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink">Tin đã lưu</h1>
        <p className="text-sm text-subtle">Bạn chưa lưu tin nào.</p>
        <Link href="/listings" className="font-semibold text-brand">Quay lại tìm nhà</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
