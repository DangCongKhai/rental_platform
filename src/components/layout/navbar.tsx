import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon, BellIcon, GlobeIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { MainNav, MainNavFallback } from "./main-nav";
import { UserMenu } from "./user-menu";

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
      <Suspense fallback={<MainNavFallback />}>
        <MainNav />
      </Suspense>
      <div className="ml-auto flex items-center gap-3.5 md:ml-0">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong px-3 text-sm font-semibold">
          <GlobeIcon className="size-[18px]" />
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
  if (!user) return <GuestActions />;

  return (
    <>
      <Link
        href="/owner/notifications"
        aria-label="Thông báo"
        className="inline-flex size-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
      >
        <BellIcon className="size-[22px]" />
      </Link>
      <UserMenu user={user} />
    </>
  );
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
