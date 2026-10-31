import { Suspense } from "react";
import { GlobeIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { AccountMenu } from "./account-menu";
import { MainNav, MainNavFallback } from "./main-nav";

export function Navbar() {
  return (
    <header className="relative z-30 flex min-h-[75px] shrink-0 flex-wrap items-center gap-x-8 gap-y-2 bg-ink px-4 py-3 text-white sm:px-10">
      <Logo />
      <Suspense fallback={<MainNavFallback />}>
        <MainNav />
      </Suspense>
      <div className="ml-auto flex items-center gap-3.5 md:ml-0">
        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong px-3 text-sm font-semibold">
          <GlobeIcon className="size-[18px]" />
          VN
        </span>
        <Suspense
          fallback={
            <span className="inline-block h-11 w-36" aria-hidden="true" />
          }
        >
          <AccountMenu />
        </Suspense>
      </div>
    </header>
  );
}
