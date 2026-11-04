"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const items = [
  { href: "/admin", segment: null, icon: "▦", label: "Bảng điều khiển" },
  {
    href: "/admin/reviews",
    segment: "reviews",
    icon: "☷",
    label: "Hàng đợi kiểm duyệt",
  },
  {
    href: "/admin/reports",
    segment: "reports",
    icon: "⚑",
    label: "Báo cáo vi phạm",
  },
  {
    href: "/admin/listings",
    segment: "listings",
    icon: "☰",
    label: "Danh sách tin đăng",
  },
] as const;

export function AdminSidebar({ userName }: { userName: string }) {
  const activeSegment = useSelectedLayoutSegment();
  const initial = userName.trim().charAt(0).toUpperCase() || "A";

  return (
    <aside className="flex min-h-[calc(100svh-3.5rem)] w-[272px] shrink-0 flex-col bg-[#1b2635] px-4 py-5 text-white">
      <Link
        href="/admin"
        className="mb-4 flex items-center gap-3 border-b border-white/10 px-3 pb-5"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-[#f5a400] text-xl font-bold text-[#172331]">
          ◈
        </span>
        <span className="leading-tight">
          <strong className="block text-xl">rentOS</strong>
          <small className="text-[11px] font-bold tracking-wide text-[#f5a400]">
            ADMIN CONSOLE
          </small>
        </span>
      </Link>

      <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.12em] text-[#bacdd6]">
        KHÔNG GIAN QUẢN TRỊ
      </p>
      <nav aria-label="Quản trị" className="space-y-2">
        {items.map((item) => {
          const active = activeSegment === item.segment;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] leading-5 transition-colors ${
                active
                  ? "bg-[#30445b] font-bold text-white"
                  : "font-medium text-[#c4cdd7] hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-9 shrink-0 place-items-center rounded-xl text-base ${
                  active
                    ? "bg-[#376da5] text-white"
                    : "bg-[#293849] text-[#c4cdd7]"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <p className="px-3 text-xs leading-5 text-[#c4cdd7]">
          Các mục chưa triển khai đang tạm khóa.
        </p>
        <Link
          href="/owner"
          className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#c4cdd7] hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden="true" className="text-lg leading-none">‹</span>
          Thoát chế độ Admin
        </Link>
        <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 pt-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5a400] text-base font-bold text-[#172331]">
            {initial}
          </span>
          <span className="min-w-0 leading-5">
            <strong className="block truncate text-sm">{userName}</strong>
            <small className="block truncate text-xs text-[#aebbc8]">
              Tài khoản đang đăng nhập
            </small>
          </span>
        </div>
      </div>
    </aside>
  );
}

export function AdminSidebarFallback({ userName }: { userName: string }) {
  const initial = userName.trim().charAt(0).toUpperCase() || "A";

  return (
    <aside aria-hidden="true" className="flex min-h-[calc(100svh-3.5rem)] w-[272px] shrink-0 flex-col bg-[#1b2635] px-4 py-5 text-white">
      <div className="mb-4 flex items-center gap-3 border-b border-white/10 px-3 pb-5">
        <span className="grid size-10 place-items-center rounded-xl bg-[#f5a400] text-xl font-bold text-[#172331]">◈</span>
        <span className="leading-tight"><strong className="block text-xl">rentOS</strong><small className="text-[11px] font-bold tracking-wide text-[#f5a400]">ADMIN CONSOLE</small></span>
      </div>
      <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.12em] text-[#bacdd6]">KHÔNG GIAN QUẢN TRỊ</p>
      <nav className="space-y-2">
        {items.map((item) => (
          <div key={item.href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#c4cdd7]">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#293849] text-base">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="mt-auto pt-8">
        <p className="px-3 text-xs leading-5 text-[#c4cdd7]">Các mục chưa triển khai đang tạm khóa.</p>
        <div className="mt-4 min-h-11 px-3 py-3 text-sm text-[#c4cdd7]">‹ &nbsp; Thoát chế độ Admin</div>
        <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 pt-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5a400] text-base font-bold text-[#172331]">{initial}</span>
          <span className="min-w-0 leading-5"><strong className="block truncate text-sm">{userName}</strong><small className="block truncate text-xs text-[#aebbc8]">Tài khoản đang đăng nhập</small></span>
        </div>
      </div>
    </aside>
  );
}
