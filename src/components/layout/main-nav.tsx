"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    label: "Tìm nhà cho bạn",
    href: "/listings",
    isActive: (pathname: string) =>
      pathname === "/listings" || pathname.startsWith("/listings/"),
  },
  {
    label: "Hướng dẫn",
    href: "/",
    isActive: () => false,
  },
  {
    label: "FAQ",
    href: "/#faq",
    isActive: () => false,
  },
  {
    label: "Cổng cư dân",
    href: "/tenant",
    isActive: () => false,
  },
  {
    label: "Cổng chủ nhà",
    href: "/owner/properties",
    isActive: (pathname: string) => pathname.startsWith("/owner"),
  },
] as const;

export function MainNavFallback() {
  return <MainNavLinks pathname="" />;
}

export function MainNav() {
  return <MainNavLinks pathname={usePathname()} />;
}

function MainNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Chính"
      className="order-last flex w-full flex-wrap justify-center gap-x-8 gap-y-1 md:order-none md:w-auto md:flex-1"
    >
      {NAV_LINKS.map((link) => {
        const active = pathname !== "" && link.isActive(pathname);
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center text-[15px] leading-[22.5px]",
              active
                ? "font-bold text-cherub"
                : "font-medium text-on-dark hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
