"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountSidebar } from "@/components/account/account-sidebar";
import {
  HomeIcon,
  RequestIcon,
  ContractIcon,
  BellIcon,
} from "@/components/ui/icons";
export function TenantNav() {
  const path = usePathname();
  return (
    <>
      <div className="hidden lg:block">
        <AccountSidebar />
      </div>
      <nav
        aria-label="Điều hướng người thuê"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {[
          { href: "/tenant", label: "Trang chính", Icon: HomeIcon },
          {
            href: "/tenant/requests",
            label: "Yêu cầu thuê",
            Icon: RequestIcon,
          },
          { href: "/tenant#tenancies", label: "Hợp đồng", Icon: ContractIcon },
          {
            href: "/account/notifications",
            label: "Thông báo",
            Icon: BellIcon,
          },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (
                href === "/tenant"
                  ? path === href
                  : path.startsWith(
                      href === "/tenant#tenancies"
                        ? "/tenant/tenancies/"
                        : href,
                    )
              )
                ? "page"
                : undefined
            }
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs text-primary"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
