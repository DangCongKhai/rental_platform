import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireUser } from "@/server/auth";

export const instant = false;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  if (!user.isAdmin) notFound();

  return (
    <div className="flex min-h-svh flex-col bg-[#eef2f6] text-[#172331]">
      <header className="flex min-h-14 items-center gap-5 border-b-2 border-[#f5a400] bg-[#071116] px-5 text-white">
        <Logo />
        <span className="rounded-full bg-[#f5a400] px-3 py-1 text-[10px] font-bold tracking-wider text-[#172331]">ADMIN CONSOLE</span>
        <span className="hidden text-xs text-white/60 md:block">Chỉ dành cho nhân viên · công cụ kiểm duyệt rentOS</span>
        <span className="ml-auto grid size-8 place-items-center rounded-full bg-[#f5a400] text-sm font-bold text-[#172331]">{user.fullName.slice(0, 1).toUpperCase()}</span>
        <span className="text-sm font-semibold">{user.fullName}</span>
        <Link href="/owner" className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Thoát chế độ Admin</Link>
      </header>
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
