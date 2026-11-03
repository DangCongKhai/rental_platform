"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { safeNext } from "@/lib/auth/safe-next";

export function GuestActions() {
  return (
    <Suspense fallback={null}>
      <GuestLinks />
    </Suspense>
  );
}

function GuestLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const destination = safeNext(`${pathname}${query ? `?${query}` : ""}`);
  const suffix = destination ? `?next=${encodeURIComponent(destination)}` : "";
  return (
    <>
      <Link
        href={`/auth/login${suffix}`}
        className="inline-flex min-h-11 items-center text-[15px] font-medium text-white"
      >
        Đăng nhập
      </Link>
      <Link
        href={`/auth/sign-up${suffix}`}
        className={buttonClass({ variant: "light" })}
      >
        Đăng ký
        <ArrowUpRightIcon />
      </Link>
    </>
  );
}
