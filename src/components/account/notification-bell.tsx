"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { NotificationList, type InboxNotification } from "./notification-list";

export function NotificationBell({
  notifications,
  onUpdated,
}: {
  notifications: InboxNotification[];
  onUpdated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((row) => !row.readAt).length;
  useEffect(() => {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSignedOut(true);
        setOpen(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  if (signedOut) return null;
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Thông báo, ${unread} chưa đọc`}
        aria-expanded={open}
        aria-controls="notification-dropdown"
        onClick={() => setOpen(!open)}
        className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-white hover:bg-white/10"
      >
        <BellIcon className="size-[22px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-0 flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notification-dropdown"
          aria-label="Thông báo"
          className="absolute right-0 top-full z-40 mt-2 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-line bg-white text-ink shadow-float"
        >
          <h2 className="px-5 py-4 text-base font-bold">Thông báo</h2>
          <div className="max-h-[420px] overflow-y-auto">
            <NotificationList
              notifications={notifications}
              compact
              onUpdated={onUpdated}
            />
          </div>
          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center justify-center border-t border-line text-sm font-semibold text-brand"
          >
            Xem tất cả thông báo
          </Link>
        </section>
      )}
    </div>
  );
}
