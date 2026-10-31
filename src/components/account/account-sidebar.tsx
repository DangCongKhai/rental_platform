"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import {
  HomeIcon,
  RequestIcon,
  ContractIcon,
  BellIcon,
  HelpIcon,
} from "@/components/ui/icons";

export function AccountSidebar() {
  return <AccountSidebarNav pathname={usePathname()} />;
}

export function AccountSidebarFallback() {
  return <AccountSidebarNav pathname="" />;
}

function AccountSidebarNav({ pathname }: { pathname: string }) {
  return (
    <aside className="shrink-0 bg-[#0e1a20] px-3.5 py-6 text-on-dark-muted lg:flex lg:min-h-[calc(100svh-75px)] lg:w-[260px] lg:flex-col h-full">
      <p className="mb-3 px-1.5 text-[11px] font-bold tracking-[1.1px] uppercase">
        Trang của bạn
      </p>
      <nav
        aria-label="Trang của bạn"
        className="flex gap-1 overflow-x-auto lg:flex-col"
      >
        {[
          { href: "/tenant", label: "Trang chính", Icon: HomeIcon },
          {
            href: "/tenant/requests",
            label: "Yêu cầu thuê",
            Icon: RequestIcon,
          },
          {
            href: "/tenant#tenancies",
            label: "Căn hộ và hợp đồng",
            Icon: ContractIcon,
          },
          {
            href: "/account/notifications",
            label: "Thông báo",
            Icon: BellIcon,
          },
          { href: "/account/reports", label: "Báo cáo của tôi" },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href ||
              (href === "/tenant/requests" &&
                pathname.startsWith("/tenant/requests/"))
                ? "page"
                : undefined
            }
            className={cn(
              "flex min-h-[46px] shrink-0 items-center gap-3 rounded-[9px] px-3 text-[15px] font-medium hover:bg-white/10",
              (pathname === href ||
                (href === "/tenant/requests" &&
                  pathname.startsWith("/tenant/requests/"))) &&
                "bg-[#22313a] text-white",
            )}
          >
            {Icon ? (
              <Icon className="size-[18px]" />
            ) : (
              <Image
                src="/images/account/reports.svg"
                alt=""
                width={18}
                height={18}
              />
            )}
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-[22px] hidden rounded-[10px] border border-[#22313a] p-3 lg:block">
        <p className="text-[13px] font-bold text-white">
          Một tài khoản, hai vai trò.
        </p>
        <p className="mt-1 text-xs leading-[18px]">
          Dễ dàng chuyển giữa tìm nhà và quản lý bất động sản cho thuê của bạn.
        </p>
      </div>
      <Link
        href="/#faq"
        className="mt-auto hidden min-h-11 items-center gap-2.5 px-3 text-sm lg:flex"
      >
        <HelpIcon className="size-[18px]" />
        Trợ giúp & Hỗ trợ
      </Link>
    </aside>
  );
}
