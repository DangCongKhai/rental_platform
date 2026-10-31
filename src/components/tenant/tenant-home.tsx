import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { dong } from "@/components/listings/listing-format";
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ContractIcon,
  RequestIcon,
} from "@/components/ui/icons";
import { publicMediaUrl } from "@/server/listings/public-media-url";
import type { getMyNotifications } from "@/server/notifications/inbox-read";
import type {
  getMyRecentRequests,
  getMyTenancies,
} from "@/server/requests/my-requests";
import { requestDate } from "./request-status";

type Tenancy = Awaited<ReturnType<typeof getMyTenancies>>[number];
type RequestRow = Awaited<ReturnType<typeof getMyRecentRequests>>[number];
type Notification = Awaited<ReturnType<typeof getMyNotifications>>[number];

const awaiting = (tenancy: Tenancy) =>
  ["PENDING_CONFIRMATION", "CONFIRMED", "ACTIVE"].includes(tenancy.status) &&
  tenancy.pendingContract != null &&
  tenancy.pendingContract.tenantConfirmedAt == null &&
  tenancy.pendingContract.tenantRejectedAt == null;

export function TenantHome({
  name,
  requests,
  openRequestCount,
  tenancies,
  notifications,
}: {
  name: string;
  requests: RequestRow[];
  openRequestCount: number;
  tenancies: Tenancy[];
  notifications: Notification[];
}) {
  const decisions = tenancies.filter(awaiting);
  const upcoming =
    tenancies.find((tenancy) => tenancy.status === "CONFIRMED") ??
    tenancies.find((tenancy) => tenancy.status === "ACTIVE");
  const unread = notifications.filter((item) => !item.readAt).length;
  const firstName = name.trim().split(/\s+/).at(-1) || name;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <header>
        <p className="text-sm text-subtle">
          Trang của bạn / Người thuê / Trang chính
        </p>
        <h1 className="pt-1 text-[28px] leading-9 font-bold tracking-[-0.56px]">
          Chào, {firstName}!
        </h1>
        <p className="text-sm text-muted">
          Tổng quan yêu cầu, hợp đồng và kỳ thuê của bạn.
        </p>
      </header>

      <section className="rounded-[15px] bg-[#1f3a5c] px-[22px] py-[18px] text-white">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Cần bạn xử lý · {decisions.length}
          </h2>
          <p className="text-[13px] text-[#c9d8ea]">
            Chỉ những việc cần bạn phản hồi trước hạn chót
          </p>
        </div>
        {decisions.length === 0 ? (
          <p className="text-sm text-[#c9d8ea]">
            Bạn không có hợp đồng cần xác nhận.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {decisions.map((tenancy) => (
              <DecisionCard key={tenancy.id} tenancy={tenancy} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          href={
            decisions[0]
              ? `/tenant/tenancies/${decisions[0].id}/review`
              : "/tenant/requests"
          }
          label="Đang chờ bạn xác nhận"
          value={
            decisions.length === 1
              ? "1 hợp đồng"
              : `${decisions.length} hợp đồng`
          }
          hint={
            decisions[0]?.confirmationExpiresAt
              ? `${timeLeft(decisions[0].confirmationExpiresAt)} · xem xét →`
              : "Xem xét →"
          }
          icon={ContractIcon}
          accent
        />
        <Stat
          href="/tenant/requests"
          label="Yêu cầu đang chờ"
          value={String(openRequestCount)}
          hint="Xem tất cả yêu cầu →"
          icon={RequestIcon}
        />
        <Stat
          href={upcoming ? `/tenant/tenancies/${upcoming.id}` : "#tenancies"}
          label="Kỳ thuê sắp tới"
          value={upcoming?.unit.label ?? "Chưa có"}
          hint={
            upcoming?.confirmedStartDate
              ? `Dọn vào từ ${requestDate(upcoming.confirmedStartDate)}`
              : "Chưa có ngày dọn vào"
          }
          hintMuted
          icon={CalendarIcon}
        />
        <Stat
          href="/account/notifications"
          label="Thông báo chưa đọc"
          value={String(unread)}
          hint="Xem thông báo →"
          icon={BellIcon}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <UpcomingTenancy tenancy={upcoming} />
        <aside className="flex flex-col gap-2.5 rounded-[15px] border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">Tác vụ nhanh</h2>
          <QuickLink href="/listings">Khám phá căn hộ</QuickLink>
          <QuickLink href="/tenant/requests">Xem yêu cầu của tôi</QuickLink>
          <QuickLink
            href={
              upcoming ? `/tenant/tenancies/${upcoming.id}` : "#tenancies"
            }
          >
            Yêu cầu gia hạn kỳ thuê
          </QuickLink>
        </aside>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[15px] border border-line bg-white">
          <div className="flex items-center justify-between px-[22px] py-[18px]">
            <h2 className="text-lg font-semibold">Yêu cầu gần đây</h2>
            <Link
              href="/tenant/requests"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
            >
              Xem tất cả →
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="border-t border-line-soft px-[22px] py-4 text-sm text-subtle">
              Chưa có yêu cầu.{" "}
              <Link href="/listings" className="font-semibold text-brand">
                Khám phá căn hộ
              </Link>
            </p>
          ) : (
            requests.map((request) => (
              <RequestRowView key={request.id} request={request} />
            ))
          )}
        </section>
        <section
          className="overflow-hidden rounded-[15px] border border-line bg-white"
        >
          <h2 className="px-[22px] py-[18px] text-lg font-semibold">
            Hoạt động gần đây
          </h2>
          {notifications.length === 0 ? (
            <p className="border-t border-line-soft px-[22px] py-4 text-sm text-subtle">
              Chưa có hoạt động.
            </p>
          ) : (
            notifications.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-t border-line-soft px-[22px] py-3"
              >
                <span className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <BellIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-[13px] text-subtle">
                    {activityTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function DecisionCard({ tenancy }: { tenancy: Tenancy }) {
  const photo = photoOf(tenancy);
  const rent = Number(
    tenancy.pendingContract?.monthlyRent ??
      tenancy.unit.advertisedMonthlyRent ??
      0,
  );
  const deadline = tenancy.confirmationExpiresAt;
  return (
    <article className="flex flex-wrap items-center gap-3.5 rounded-xl bg-white p-4 text-ink">
      <Thumb src={photo} alt="" className="h-[62px] w-[84px] rounded-[10px]" />
      <div className="min-w-[220px] flex-1">
        <div className="mb-1 flex flex-wrap gap-2">
          <Chip tone="warning">Đề xuất chờ bạn xác nhận</Chip>
          <Chip tone="info">
            Phiên bản {tenancy.pendingContract?.versionNumber} · Bản gốc
          </Chip>
        </div>
        <p className="text-base font-bold">
          {tenancy.unit.label} · {tenancy.unit.property.name}
        </p>
        <p className="text-[13px] text-subtle">
          {rent > 0 ? `${dong(rent)}/tháng` : "Giá theo đề xuất"}
          {tenancy.confirmedStartDate && tenancy.confirmedEndDate
            ? ` · ${requestDate(tenancy.confirmedStartDate)} – ${requestDate(tenancy.confirmedEndDate)}`
            : ""}
          {deadline ? ` · phản hồi trước ${deadlineLabel(deadline)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {deadline && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dce9f7] px-3.5 py-1.5 text-sm font-semibold text-[#1f4e85]">
            <ClockIcon className="size-3.5" />
            {timeLeft(deadline)}
          </span>
        )}
        <Link
          href={`/tenant/tenancies/${tenancy.id}/review`}
          className="inline-flex min-h-11 items-center rounded-[15px] bg-brand px-5 text-[15px] font-semibold text-white"
        >
          Xem xét và xác nhận
        </Link>
      </div>
    </article>
  );
}

function UpcomingTenancy({ tenancy }: { tenancy: Tenancy | undefined }) {
  if (!tenancy) {
    return (
      <section
        id="tenancies"
        className="scroll-mt-24 rounded-[15px] border border-line bg-white p-6"
      >
        <p className="text-[13px] text-subtle">Kỳ thuê sắp tới</p>
        <h2 className="mt-2 text-[22px] font-bold">Chưa có kỳ thuê hiện tại.</h2>
      </section>
    );
  }
  const rent = Number(
    tenancy.latestConfirmedContract?.monthlyRent ??
      tenancy.unit.advertisedMonthlyRent ??
      0,
  );
  const version = tenancy.latestConfirmedContract?.versionNumber;
  const confirmed = tenancy.status === "CONFIRMED";
  return (
    <section
      id="tenancies"
      className="scroll-mt-24 overflow-hidden rounded-[15px] border border-line bg-white"
    >
      <div className="relative aspect-[16/10] bg-canvas">
        <Thumb
          src={photoOf(tenancy)}
          alt={`${tenancy.unit.label} · ${tenancy.unit.property.name}`}
          className="absolute inset-0 size-full rounded-none"
        />
      </div>
      <div className="flex flex-col gap-2 px-6 py-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-subtle">
            {confirmed ? "Kỳ thuê sắp tới" : "Kỳ thuê hiện tại"}
          </p>
          <Chip tone="success">
            <CheckIcon className="size-3.5" />
            {confirmed ? "Đã xác nhận · chờ dọn vào" : "Đang thuê"}
          </Chip>
        </div>
        <h2 className="text-[22px] leading-[30px] font-bold tracking-[-0.22px]">
          {tenancy.unit.label}
          {tenancy.unit.property.ward ? ` · ${tenancy.unit.property.ward}` : ""}
        </h2>
        <p className="text-sm text-muted">
          {[
            `${tenancy.unit.bedrooms} phòng ngủ`,
            tenancy.unit.areaM2 != null
              ? `${Number(tenancy.unit.areaM2)} m²`
              : null,
            tenancy.confirmedStartDate && tenancy.confirmedEndDate
              ? `${requestDate(tenancy.confirmedStartDate)} – ${requestDate(tenancy.confirmedEndDate)}`
              : null,
            tenancy.confirmedStartDate && tenancy.confirmedEndDate
              ? monthsBetween(
                  tenancy.confirmedStartDate,
                  tenancy.confirmedEndDate,
                )
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="my-1.5 h-px bg-line" />
        <p className="text-[13px] text-subtle">
          Giá thuê theo điều khoản đã xác nhận
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="text-2xl font-bold text-brand">
              {rent > 0 ? dong(rent) : "—"}
            </span>
            {version != null && (
              <span className="text-sm font-medium text-muted">
                {" "}
                /tháng · v{version}
              </span>
            )}
          </p>
          <Link
            href={`/tenant/tenancies/${tenancy.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[15px] border border-line-brand px-5 text-[15px] font-semibold text-brand-deep"
          >
            <ContractIcon className="size-[18px]" />
            Xem hợp đồng
          </Link>
        </div>
      </div>
    </section>
  );
}

function RequestRowView({ request }: { request: RequestRow }) {
  const path = request.listing.property.media[0]?.storagePath;
  const photo = path ? publicMediaUrl(path) : null;
  const status = requestChip(request);
  return (
    <Link
      href={`/tenant/requests/${request.id}`}
      className="flex items-center gap-3.5 border-t border-line-soft px-[22px] py-3.5"
    >
      <Thumb src={photo} alt="" className="h-[52px] w-[72px] rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold">{request.listing.title}</p>
        <p className="text-[13px] text-subtle">
          Gửi {requestDate(request.createdAt)} ·{" "}
          {requestDate(request.desiredMoveInDate)} –{" "}
          {requestDate(request.desiredEndDate)}
          {request.preferredUnit ? ` · ưu tiên ${request.preferredUnit.label}` : ""}
        </p>
        {request.tenancy?.confirmationExpiresAt &&
          request.status === "ACCEPTED" && (
            <p className="text-sm font-semibold text-brand">
              Đang chờ bạn xác nhận ·{" "}
              {timeLeft(request.tenancy.confirmationExpiresAt).toLowerCase()}
            </p>
          )}
      </div>
      <Chip tone={status.tone}>{status.label}</Chip>
    </Link>
  );
}

function Stat({
  href,
  label,
  value,
  hint,
  hintMuted = false,
  accent = false,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  hintMuted?: boolean;
  accent?: boolean;
  icon: typeof ContractIcon;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1.5 rounded-[15px] border bg-white p-6 ${accent ? "border-[#bfd3ea]" : "border-line"}`}
    >
      <span className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <Icon className="size-[18px] text-brand" />
      </span>
      <p className="truncate text-[28px] leading-9 font-bold">{value}</p>
      <p
        className={`text-sm ${hintMuted ? "text-[13px] text-subtle" : "font-semibold text-brand"}`}
      >
        {hint}
      </p>
    </Link>
  );
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between rounded-[15px] border border-line-brand px-5 text-[15px] font-semibold text-brand-deep"
    >
      {children}
      <ArrowRightIcon className="size-3.5" />
    </Link>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "warning" | "info" | "success" | "danger";
  children: ReactNode;
}) {
  const styles = {
    warning: "bg-[#fff1cc] text-[#7a4a00]",
    info: "bg-[#dce9f7] text-[#1f4e85]",
    success: "bg-success-soft text-success",
    danger: "bg-[#fde4e1] text-danger-ink",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function Thumb({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className: string;
}) {
  return (
    <span className={`relative block overflow-hidden bg-canvas ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="360px" className="object-cover" />
      ) : null}
    </span>
  );
}

function monthsBetween(start: Date, end: Date) {
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  return months > 0 ? `${months} tháng` : null;
}

function photoOf(tenancy: Tenancy) {
  const path = tenancy.unit.property.media[0]?.storagePath;
  return path ? publicMediaUrl(path) : null;
}

function requestChip(request: RequestRow): {
  tone: "warning" | "info" | "danger";
  label: string;
} {
  if (request.status === "PENDING") {
    return { tone: "warning", label: "Đang chờ xử lý" };
  }
  if (request.status === "ACCEPTED") {
    return { tone: "info", label: "Đã chấp nhận" };
  }
  if (request.status === "REJECTED") {
    return { tone: "danger", label: "Đã từ chối" };
  }
  return { tone: "danger", label: "Đã rút lại" };
}

function timeLeft(date: Date) {
  const hours = Math.ceil((date.getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return "Đã hết hạn";
  if (hours < 48) return `Còn ${hours} giờ`;
  return `Còn ${Math.ceil(hours / 24)} ngày`;
}

function deadlineLabel(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function activityTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
