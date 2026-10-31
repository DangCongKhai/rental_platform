"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, LogoutIcon } from "@/components/ui/icons";

export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu tài khoản"
        className="inline-flex min-h-12 cursor-pointer items-center gap-2 text-white"
      >
        <Avatar
          initials={user.initials}
          className="size-11.5 border-2 border-white"
        />
        <ChevronDownIcon className="size-4.5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 top-full mt-2 flex w-80 max-w-[calc(100vw-32px)] flex-col rounded-[14px] border border-line bg-white p-2 text-ink shadow-[0_18px_44px_rgba(9,18,22,.22)]"
        >
          <div className="flex items-center gap-3 p-3">
            <Avatar initials={user.initials} className="size-11" />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold">{user.name}</div>
              <div className="truncate text-[13px] text-subtle">
                {user.email}
              </div>
            </div>
          </div>
          <div className="my-1 h-px bg-line-soft" />
          {[
            {
              href: "/account/profile",
              label: "Hồ sơ cá nhân",
              icon: "profile",
            },
            {
              href: "/tenant",
              label: "Trang của bạn (Người thuê)",
              icon: "tenant",
            },
            {
              href: "/owner",
              label: "Không gian quản lý (Chủ nhà)",
              icon: "owner",
            },
            {
              href: "/account/reports",
              label: "Báo cáo của tôi",
              icon: "reports",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium hover:bg-brand-soft"
            >
              <Image
                src={`/images/account/${item.icon}.svg`}
                alt=""
                width={18}
                height={18}
              />
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-line-soft" />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-left text-[15px] font-medium text-danger-ink hover:bg-[#fdf2f1]"
          >
            <LogoutIcon className="size-4.5" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-cherub text-[15px] font-bold text-ink",
        className,
      )}
    >
      {initials}
    </span>
  );
}
