"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { GlobeIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";
import {
  MainNav,
  MainNavFallback,
} from "./main-nav";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isScrolled, setIsScrolled] =
    useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector(
      "[data-scroll-root]",
    );
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      const scrolled = scrollContainer.scrollTop > 10;
      setIsScrolled(scrolled);
    };

    // Listen to scroll container
    scrollContainer.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    // Check initial scroll state
    handleScroll();

    return () => {
      scrollContainer.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  return (
    <header
      data-scrolled={isHome && isScrolled ? "" : undefined}
      className={cn(
        "z-40 flex min-h-[75px] shrink-0 flex-wrap",
        "items-center gap-x-8 gap-y-2 bg-ink px-4 py-3",
        "text-white transition-colors duration-200 sm:px-10",
      )}
    >
      <Logo />
      <Suspense fallback={<MainNavFallback />}>
        <MainNav />
      </Suspense>
      <div className="ml-auto flex items-center gap-3.5 md:ml-0">
        <Suspense
          fallback={
            <span
              className="inline-block h-11 w-36"
              aria-hidden="true"
            />
          }
        >
          <AccountMenu />
        </Suspense>
      </div>
    </header>
  );
}
