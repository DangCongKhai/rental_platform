"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BellIcon,
  BuildingIcon,
  ContractIcon,
  HelpIcon,
  HomeIcon,
  MenuListIcon,
  RequestIcon,
  UserIcon,
} from "@/components/ui/icons";

const ITEMS = [
  { href: "/owner", label: "Tổng quan", icon: HomeIcon, exact: true },
  { href: "/owner/properties", label: "Bất động sản", icon: BuildingIcon, exact: false },
  { href: "/owner/listings", label: "Tin đăng", icon: MenuListIcon, exact: false },
  { href: "/owner/requests", label: "Yêu cầu thuê", icon: RequestIcon, exact: false },
  { href: "/owner/tenancies", label: "Kỳ thuê và hợp đồng", icon: ContractIcon, exact: false },
  { href: "/owner/notifications", label: "Thông báo", icon: BellIcon, exact: false },
  { href: "/owner/profile", label: "Hồ sơ cá nhân", icon: UserIcon, exact: false },
] as const;

function isCurrent(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerSidebar() {
  return <OwnerSidebarNav pathname={usePathname()} />;
}

/** Static sidebar for the Suspense fallback while the current path streams in. */
export function OwnerSidebarFallback() {
  return <OwnerSidebarNav pathname="" />;
}

function OwnerSidebarNav({ pathname }: { pathname: string }) {
  return (
    <aside className="shrink-0 bg-ink text-white lg:flex lg:min-h-[calc(100svh-75px)] lg:w-[260px] lg:flex-col lg:px-4 lg:py-5">
      <p className="mb-4 hidden px-3 text-[11px] font-bold tracking-[0.16em] text-on-dark-muted uppercase lg:block">
        Không gian quản lý
      </p>
      <nav
        aria-label="Cổng chủ nhà"
        className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0"
      >
        {ITEMS.map((item) => {
          const active = isCurrent(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-[15px] leading-snug lg:min-h-[42px] lg:shrink lg:items-start lg:py-2.5",
                active
                  ? "bg-white/10 font-semibold text-white"
                  : "font-medium text-on-dark hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px] lg:mt-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mx-4 mt-6 hidden rounded-2xl border border-white/15 p-4 lg:mx-0 lg:block">
        <p className="text-sm font-semibold text-white">Một tài khoản, hai vai trò.</p>
        <p className="mt-1.5 text-[13px] leading-5 text-on-dark-muted">
          Dễ dàng chuyển giữa tìm nhà và quản lý bất động sản cho thuê của bạn.
        </p>
      </div>
      <Link
        href="/#faq"
        className="mt-4 hidden min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-on-dark hover:bg-white/5 hover:text-white lg:mt-auto lg:inline-flex"
      >
        <HelpIcon className="size-[18px]" />
        Trợ giúp & Hỗ trợ
      </Link>
    </aside>
  );
}
