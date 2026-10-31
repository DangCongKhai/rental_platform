"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/notifications/inbox";
import type { getMyNotifications } from "@/server/notifications/inbox-read";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InboxNotification = Awaited<
  ReturnType<typeof getMyNotifications>
>[number];
export const AUDIENCE_LABELS: Record<string, string> = {
  TENANT: "Người thuê",
  OWNER: "Chủ nhà",
  ADMIN: "Quản trị",
};

function notificationHref(row: InboxNotification): string | null {
  const side =
    row.audience === "OWNER"
      ? "owner"
      : row.audience === "TENANT"
        ? "tenant"
        : null;
  if (side && row.resourceType === "tenancy")
    return `/${side}/tenancies/${row.resourceId}`;
  if (
    side &&
    (row.resourceType === "rental_request" || row.resourceType === "request")
  )
    return `/${side}/requests/${row.resourceId}`;
  if (row.resourceType === "listing_report" || row.resourceType === "report")
    return row.audience === "ADMIN" ? null : "/account/reports";
  return null;
}

export function NotificationList({
  notifications,
  compact = false,
  onUpdated,
}: {
  notifications: InboxNotification[];
  compact?: boolean;
  onUpdated?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const router = useRouter();
  const unread = notifications.filter((row) => !row.readAt).length;
  const visible = unreadOnly
    ? notifications.filter((row) => !row.readAt)
    : notifications;

  const markAll = () =>
    startTransition(async () => {
      setError("");
      try {
        const result = await markAllNotificationsRead();
        if (!result.ok) setError(result.error);
        else onUpdated?.();
      } catch {
        setError("Không thể cập nhật thông báo. Vui lòng thử lại.");
      }
    });
  const open = (row: InboxNotification) =>
    startTransition(async () => {
      setError("");
      try {
        const result = await markNotificationRead(row.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onUpdated?.();
        const href = notificationHref(row);
        if (href) router.push(href);
      } catch {
        setError("Không thể cập nhật thông báo. Vui lòng thử lại.");
      }
    });

  return (
    <div className="min-w-0 text-ink">
      {!compact && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex gap-4" aria-label="Lọc thông báo">
            <button
              type="button"
              aria-pressed={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
              className={cn(
                "min-h-11 cursor-pointer text-sm",
                !unreadOnly && "font-bold text-brand",
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(true)}
              className={cn(
                "min-h-11 cursor-pointer text-sm",
                unreadOnly && "font-bold text-brand",
              )}
            >
              Chưa đọc ({unread})
            </button>
          </div>
          <Button
            variant="secondary"
            disabled={pending || !unread}
            onClick={markAll}
          >
            Đánh dấu tất cả là đã đọc
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div
        className={cn(
          "overflow-hidden bg-white",
          !compact && "rounded-[15px] border border-line",
        )}
      >
        {!visible.length && (
          <p className="p-6 text-center text-sm text-subtle">
            Chưa có thông báo{unreadOnly ? " chưa đọc" : ""}.
          </p>
        )}
        {visible.map((row) => (
          <button
            key={row.id}
            type="button"
            disabled={pending}
            onClick={() => open(row)}
            className={cn(
              "flex w-full cursor-pointer gap-3.5 border-b border-line-soft px-5 py-4 text-left last:border-b-0 hover:bg-brand-soft disabled:cursor-wait",
              !row.readAt && "bg-[#f7faff]",
            )}
          >
            <span
              aria-label={row.readAt ? "Đã đọc" : "Chưa đọc"}
              className={cn(
                "mt-2 size-2.5 shrink-0 rounded-full",
                !row.readAt && "bg-brand",
              )}
            />
            <span className="min-w-0">
              <span className="mb-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
                {AUDIENCE_LABELS[row.audience]}
              </span>
              <span
                className={cn(
                  "block text-[15px] text-ink-2",
                  row.readAt ? "font-medium" : "font-bold",
                )}
              >
                {row.title}
              </span>
              <span className="block text-sm text-muted">{row.body}</span>
              <time
                dateTime={row.createdAt}
                className="mt-0.5 block text-[13px] text-subtle"
              >
                {new Intl.DateTimeFormat("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(row.createdAt))}
              </time>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
