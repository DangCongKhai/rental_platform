import Link from "next/link";

const items = [
  ["/admin", "▦", "Bảng điều khiển"],
  ["/admin/reviews", "☷", "Hàng đợi kiểm duyệt"],
  ["/admin/reports", "⚑", "Báo cáo vi phạm"],
  ["/admin/listings", "☰", "Danh sách tin đăng"],
] as const;

export function AdminSidebar() {
  return (
    <aside className="flex w-[250px] shrink-0 flex-col bg-[#1b2635] px-3 py-5 text-white">
      <Link href="/admin" className="mb-5 flex items-center gap-3 border-b border-white/10 px-2 pb-5">
        <span className="grid size-10 place-items-center rounded-xl bg-[#f5a400] text-lg font-bold text-[#172331]">◆</span>
        <span className="leading-tight"><strong className="block">rentOS</strong><small className="text-[10px] font-bold tracking-wide text-[#f5a400]">ADMIN CONSOLE</small></span>
      </Link>
      <nav aria-label="Quản trị" className="space-y-1">
        {items.map(([href, icon, label]) => (
          <Link key={href} href={href} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10 hover:text-white">
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-white/10 text-xs">{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <Link href="/owner" className="mt-auto border-t border-white/10 pt-4 text-xs text-white/70 hover:text-white">← Thoát chế độ Admin</Link>
    </aside>
  );
}
