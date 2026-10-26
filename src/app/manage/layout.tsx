import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";

export default function ManageLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <>
            <Navbar compact />
            <div className="flex min-h-[calc(100vh-3rem)] w-full flex-1 flex-col lg:flex-row">
                <aside className="shrink-0 bg-ink px-4 py-4 text-white lg:min-h-[calc(100vh-3rem)] lg:w-60 lg:px-5 lg:py-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-muted">Không gian quản lý</p>
                    <nav aria-label="Không gian quản lý" className="flex gap-2 overflow-x-auto lg:flex-col">
                        <Link href="/" className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-white/10 px-3 text-xs font-medium text-on-dark hover:bg-white/10">Người thuê</Link>
                        <Link href="/manage/properties" aria-current="page" className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white">Chủ nhà</Link>
                    </nav>
                    <div className="mt-6 hidden space-y-1 lg:block">
                        <Link href="/manage/properties" aria-current="page" className="flex min-h-10 items-center gap-3 rounded-lg bg-white/10 px-3 text-sm font-semibold text-white">
                            <span aria-hidden="true">⌂</span>
                            Bất động sản
                        </Link>
                    </div>
                </aside>

                <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
            </div>
        </>
    );
}
