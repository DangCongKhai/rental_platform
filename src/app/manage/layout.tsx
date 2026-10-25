import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";

export default function ManageLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <>
            <Navbar/>
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8 lg:flex-row lg:gap-10">
                <aside className="shrink-0 lg:w-60">
                    <nav aria-label="Không gian quản lý" className="flex gap-2 overflow-x-auto lg:flex-col">
                        <Link href="/" className="min-h-11 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-subtle hover:bg-white">Người thuê</Link>
                        <Link href="/manage/properties" aria-current="page" className="min-h-11 whitespace-nowrap rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-deep">Chủ nhà · Bất động sản</Link>
                    </nav>
                </aside>

                <main className="min-w-0 flex-1">{children}</main>
            </div>
        </>
    );
}