import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon, GlobeIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { UserMenu } from "./user-menu";
import { connection } from "next/server";

// Search, guide and owner pages are not built yet; they point home for now.
const NAV_LINKS = [
  { label: "Tìm nhà cho bạn", href: "/" },
  { label: "Hướng dẫn", href: "/" },
  { label: "FAQ", href: "/#faq" },
  { label: "Quản lý thuê", href: "/manage/properties" },
];

type NavbarProps = {
  /** Transparent over a hero image (landing) instead of solid dark. */
  transparent?: boolean;
};

export function Navbar({ transparent = false }: NavbarProps) {
  return (
    <header
      className={cn(
        "relative z-30 flex min-h-[75px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 text-white sm:px-10",
        transparent ? "border-b border-white/14 bg-transparent" : "bg-ink",
      )}
    >
      <Logo />
      <nav
        aria-label="Chính"
        className="order-last flex w-full flex-wrap justify-center gap-x-8 gap-y-1 md:order-none md:w-auto md:flex-1"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="inline-flex min-h-11 items-center text-[15px] font-medium text-on-dark hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3.5 md:ml-0">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong px-3 text-sm font-semibold">
          <GlobeIcon className="size-4.5" />
          VN
        </span>
        <Suspense fallback={<GuestActions />}>
          <AccountActions />
        </Suspense>
      </div>
    </header>
  );
}

async function AccountActions() {
  await connection();
  const user = await getCurrentUser();
  return user ? <UserMenu user={user} /> : <GuestActions />;
}

function GuestActions() {
  return (
    <>
      <Link
        href="/auth/login"
        className="inline-flex min-h-11 items-center text-[15px] font-medium text-white"
      >
        Đăng nhập
      </Link>
      <Link href="/auth/sign-up" className={buttonClass({ variant: "light" })}>
        Đăng ký
        <ArrowUpRightIcon />
      </Link>
    </>
  );
}
