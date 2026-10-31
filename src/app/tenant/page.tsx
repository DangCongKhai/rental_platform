import { Suspense } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/loading-screen";
import {
  getMyRentalRequests,
  getMyTenancies,
} from "@/server/requests/my-requests";
import { getMyNotifications } from "@/server/notifications/inbox-read";
import { RequestStatus, requestDate } from "@/components/tenant/request-status";
export default function TenantPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải trang của bạn..."
          className="min-h-80 w-full"
        />
      }
    >
      <TenantHome />
    </Suspense>
  );
}
async function TenantHome() {
  const [requests, tenancies, notifications] = await Promise.all([
    getMyRentalRequests(),
    getMyTenancies(),
    getMyNotifications({ audience: "TENANT" }),
  ]);
  const decisions = tenancies.filter(
    (t) =>
      ["PENDING_CONFIRMATION", "CONFIRMED", "ACTIVE"].includes(t.status) &&
      t.pendingContract &&
      !t.pendingContract.tenantConfirmedAt &&
      !t.pendingContract.tenantRejectedAt,
  );
  const active = tenancies.filter(
    (t) => t.status === "ACTIVE" || t.status === "CONFIRMED",
  );
  return (
    <section className="max-w-[1100px] space-y-5">
      <header>
        <h1 className="text-[28px] font-bold">Trang của bạn</h1>
        <p className="text-sm text-slate-500">
          Tổng quan yêu cầu, hợp đồng và kỳ thuê của bạn.
        </p>
      </header>
      <section className="rounded-2xl bg-[#203e61] p-5 text-white">
        <h2 className="mb-3 font-bold">Cần bạn xử lý · {decisions.length}</h2>
        {decisions.length ? (
          decisions.map((t) => (
            <article
              key={t.id}
              className="mb-2 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 text-slate-900"
            >
              <div>
                <p className="font-semibold">
                  {t.unit.label} · {t.unit.property.name}
                </p>
                <p className="text-sm">
                  Đang chờ bạn xác nhận hợp đồng · Phiên bản{" "}
                  {t.pendingContract!.versionNumber}
                </p>
                {t.confirmationExpiresAt && (
                  <p className="text-xs text-slate-500">
                    Hạn xác nhận: {requestDate(t.confirmationExpiresAt)}
                  </p>
                )}
              </div>
              <Link
                className="rounded-xl bg-primary px-4 py-3 text-sm text-white"
                href={`/tenant/tenancies/${t.id}/review`}
              >
                Xem xét và xác nhận
              </Link>
            </article>
          ))
        ) : (
          <p className="text-sm">Bạn không có hợp đồng cần xác nhận.</p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Yêu cầu đang mở", requests.total, "/tenant/requests"],
          ["Kỳ thuê hiện tại", active.length, "#tenancies"],
          [
            "Thông báo chưa đọc",
            notifications.filter((n) => !n.readAt).length,
            "/account/notifications",
          ],
        ].map(([label, count, href]) => (
          <Link
            key={label}
            href={String(href)}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{count}</p>
          </Link>
        ))}
      </div>
      <section
        id="tenancies"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 className="mb-4 text-lg font-bold">Căn hộ và hợp đồng</h2>
        {!active.length && (
          <p className="text-sm text-slate-500">Chưa có kỳ thuê hiện tại.</p>
        )}
        {active.map((t) => (
          <article key={t.id} className="border-t border-slate-100 py-4">
            <Link
              className="font-semibold text-primary"
              href={`/tenant/tenancies/${t.id}`}
            >
              {t.unit.label} · {t.unit.property.name}
            </Link>
            <p className="mt-1 text-sm">
              {t.status === "ACTIVE"
                ? "Đang thuê"
                : "Đã xác nhận · Chờ dọn vào"}
            </p>
            {t.confirmedStartDate && t.confirmedEndDate && (
              <p className="mt-1 text-sm text-slate-500">
                Ngày thuê đã xác nhận: {requestDate(t.confirmedStartDate)} –{" "}
                {requestDate(t.confirmedEndDate)}
              </p>
            )}
          </article>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex justify-between">
          <h2 className="font-bold">Yêu cầu gần đây</h2>
          <Link className="text-sm text-primary" href="/tenant/requests">
            Xem tất cả →
          </Link>
        </div>
        {!requests.requests.length && (
          <p className="text-sm text-slate-500">
            Chưa có yêu cầu đang mở.{" "}
            <Link className="text-primary" href="/listings">
              Khám phá căn hộ
            </Link>
          </p>
        )}
        {requests.requests.slice(0, 3).map((r) => (
          <article
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4"
          >
            <Link
              className="text-sm font-semibold"
              href={`/tenant/requests/${r.id}`}
            >
              {r.listing.title}
            </Link>
            <RequestStatus
              status={r.status}
              tenancyStatus={r.tenancy?.status}
            />
          </article>
        ))}
      </section>
    </section>
  );
}
