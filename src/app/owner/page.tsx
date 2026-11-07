import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { getOwnerOverview } from "@/server/owner-overview";

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
  }).format(value);
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const colors = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}

const requestStatus: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  PENDING: { label: "Đang chờ xử lý", tone: "warning" },
  ACCEPTED: { label: "Đã chấp nhận", tone: "success" },
  REJECTED: { label: "Đã từ chối", tone: "danger" },
  WITHDRAWN: { label: "Đã rút lại", tone: "neutral" },
  EXPIRED: { label: "Đã hết hạn", tone: "danger" },
  CANCELLED: { label: "Đã hủy", tone: "neutral" },
  AWAITING_REVISION: { label: "Cần bổ sung thông tin", tone: "warning" },
};

export default function OwnerOverviewPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải tổng quan..."
          className="min-h-80 w-full"
        />
      }
    >
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const overview = await getOwnerOverview();

  const rejectedListings = overview.listings
    .filter((item) => item.moderationStatus === "REJECTED")
    .reduce((total, item) => total + item.count, 0);

  const suspendedListings = overview.listings
    .filter((item) => item.suspended)
    .reduce((total, item) => total + item.count, 0);

  const listingsNeedingAttention = rejectedListings + suspendedListings;
  const maintenanceUnits = overview.units.maintenance;

  const countListings = (
    predicate: (listing: (typeof overview.listings)[number]) => boolean,
  ) =>
    overview.listings
      .filter(predicate)
      .reduce((total, listing) => total + listing.count, 0);

  const listingCounts = {
    draft: countListings((item) => item.moderationStatus === "DRAFT"),
    pending: countListings((item) => item.moderationStatus === "PENDING"),
    approved: countListings((item) => item.moderationStatus === "APPROVED"),
    rejected: rejectedListings,
    published: countListings((item) => item.publicationStatus === "PUBLISHED"),
    hidden: countListings((item) => item.publicationStatus === "HIDDEN"),
    suspended: suspendedListings,
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-muted">
          Không gian quản lý / Chủ nhà / Tổng quan
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight text-ink">
          Tổng quan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tổng quan hoạt động cho thuê bất động sản của bạn.
        </p>
      </header>

      {overview.propertyCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">
            Bắt đầu với bất động sản đầu tiên
          </h2>
          <p className="mt-2 text-sm text-muted">
            Tạo bất động sản để quản lý yêu cầu thuê, tin đăng và kỳ thuê tại
            đây.
          </p>
          <Link
            href="/owner/properties/new"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white"
          >
            Tạo bất động sản
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Yêu cầu chờ xử lý"
              count={overview.requests.pending}
              detail="Xem yêu cầu đang chờ"
              href="/owner/requests?tab=pending"
              tone="blue"
            />
            <SummaryCard
              title="Đề xuất chờ người thuê"
              count={overview.tenancies.waitingForTenant}
              detail="Xem kỳ thuê và hợp đồng"
              href="/owner/tenancies?tab=waiting-tenant"
              tone="blue"
            />
            <SummaryCard
              title="Tin đăng cần chú ý"
              count={listingsNeedingAttention}
              detail={`${rejectedListings} bị từ chối · ${suspendedListings} bị đình chỉ`}
              href="/owner/listings"
              tone="amber"
            />
            <SummaryCard
              title="Căn đang bảo trì"
              count={maintenanceUnits}
              detail="Xem bất động sản"
              href="/owner/properties"
              tone="blue"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-3 font-bold">Căn/phòng theo tình trạng</h2>
              <div className="space-y-2">
                <StatusLink
                  title="Sẵn sàng"
                  count={overview.units.ready}
                  href="/owner/properties?unitStatus=READY"
                />
                <StatusLink
                  title="Đang bảo trì"
                  count={overview.units.maintenance}
                  href="/owner/properties?unitStatus=MAINTENANCE"
                />
                <StatusLink
                  title="Đã ngừng hoạt động"
                  count={overview.units.retired}
                  href="/owner/properties?unitStatus=RETIRED"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-3 font-bold">Tin đăng theo trạng thái</h2>
              <div className="space-y-2">
                <StatusLink
                  title="Bản nháp"
                  count={listingCounts.draft}
                  href="/owner/listings?moderationStatus=DRAFT"
                />
                <StatusLink
                  title="Đang chờ duyệt"
                  count={listingCounts.pending}
                  href="/owner/listings?moderationStatus=PENDING"
                />
                <StatusLink
                  title="Đã duyệt"
                  count={listingCounts.approved}
                  href="/owner/listings?moderationStatus=APPROVED"
                />
                <StatusLink
                  title="Bị từ chối"
                  count={listingCounts.rejected}
                  href="/owner/listings?moderationStatus=REJECTED"
                />
                <StatusLink
                  title="Đang công khai"
                  count={listingCounts.published}
                  href="/owner/listings?publicationStatus=PUBLISHED"
                />
                <StatusLink
                  title="Đã ẩn"
                  count={listingCounts.hidden}
                  href="/owner/listings?publicationStatus=HIDDEN"
                />
                <StatusLink
                  title="Bị đình chỉ"
                  count={listingCounts.suspended}
                  href="/owner/listings?suspended=1"
                />
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="font-bold">Yêu cầu thuê gần đây</h2>
                <p className="mt-1 text-sm text-muted">
                  Gọi cho người thuê rồi tạo đề xuất hợp đồng.
                </p>
              </div>
              <Link
                href="/owner/requests"
                className="rounded-xl border border-line-brand px-4 py-2 text-sm font-semibold text-brand-deep"
              >
                Xem tất cả yêu cầu
              </Link>
            </div>

            {overview.recentRequests.length === 0 ? (
              <p className="border-t border-line p-6 text-center text-sm text-muted">
                Chưa có yêu cầu thuê.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f7f9fb] text-xs text-subtle">
                    <tr>
                      <th className="px-4 py-3">Người yêu cầu</th>
                      <th className="px-4 py-3">Bất động sản · căn ưu tiên</th>
                      <th className="px-4 py-3">Ngày mong muốn</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">
                        <span className="sr-only">Chi tiết</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentRequests.map((request) => (
                      <tr key={request.id} className="border-t border-line">
                        <td className="px-4 py-4 font-semibold">
                          {request.contactName}
                        </td>
                        <td className="px-4 py-4">
                          <p>{request.listing.property.name}</p>
                          <p className="text-xs text-muted">
                            {request.preferredUnit?.label ??
                              "Không ưu tiên căn"}
                          </p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {date(request.desiredMoveInDate)} –{" "}
                          {date(request.desiredEndDate)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            tone={requestStatus[request.status]?.tone ?? "neutral"}
                          >
                            {requestStatus[request.status]?.label ?? "Khác"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/owner/requests/${request.id}`}
                            className="font-semibold text-brand"
                          >
                            Chi tiết →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              {overview.requests.pending} yêu cầu đang chờ xử lý
            </p>
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-bold">Bất động sản của bạn</h2>
                <Link
                  href="/owner/properties"
                  className="text-sm font-semibold text-brand"
                >
                  Quản lý bất động sản →
                </Link>
              </div>

              <div className="space-y-3">
                {overview.recentProperties.map((property) => (
                  <article
                    key={property.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"
                  >
                    {property.listing?.coverUrl ? (
                      <Image
                        src={property.listing.coverUrl}
                        alt=""
                        width={88}
                        height={64}
                        className="h-16 w-[88px] rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="h-16 w-[88px] rounded-lg bg-slate-100"
                      />
                    )}

                    <div className="min-w-40 flex-1">
                      <h3 className="font-semibold">{property.name}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {property.address || "Chưa thêm địa chỉ"} ·{" "}
                        {property.unitCount} căn
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {property.listing ? (
                        <>
                          <Badge
                            tone={
                              property.listing.moderationStatus === "APPROVED"
                                ? "success"
                                : property.listing.moderationStatus ===
                                    "REJECTED"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {property.listing.moderationStatus === "APPROVED"
                              ? "Đã duyệt"
                              : property.listing.moderationStatus === "PENDING"
                                ? "Đang duyệt"
                                : property.listing.moderationStatus ===
                                    "REJECTED"
                                  ? "Bị từ chối"
                                  : "Bản nháp"}
                          </Badge>
                          <Badge
                            tone={
                              property.listing.suspended
                                ? "danger"
                                : property.listing.publicationStatus ===
                                    "PUBLISHED"
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {property.listing.suspended
                              ? "Bị đình chỉ"
                              : property.listing.publicationStatus ===
                                  "PUBLISHED"
                                ? "Đã đăng"
                                : property.listing.publicationStatus ===
                                    "HIDDEN"
                                  ? "Đã ẩn"
                                  : "Chưa đăng"}
                          </Badge>
                        </>
                      ) : (
                        <Link
                          href={`/owner/listings/new?propertyId=${property.id}`}
                          className="text-sm font-semibold text-brand"
                        >
                          Tạo tin đăng →
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-4 font-bold">Cần chú ý</h2>
              <div className="space-y-3">
                <AttentionLink
                  title="Đề xuất chờ người thuê"
                  count={overview.tenancies.waitingForTenant}
                  href="/owner/tenancies?tab=waiting-tenant"
                />

                <AttentionLink
                  title="Phiên bản cần gửi lại"
                  count={overview.tenancies.revisionNeeded}
                  href="/owner/tenancies?tab=revision-needed"
                />

                <AttentionLink
                  title="Yêu cầu gia hạn cần trả lời"
                  count={overview.renewals.pending}
                  href="/owner/tenancies?tab=renewal-pending"
                />
                <AttentionLink
                  title="Căn đang bảo trì"
                  count={maintenanceUnits}
                  href="/owner/properties"
                />
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-bold">Quản lý cho thuê hiệu quả hơn</h2>
            <p className="mt-1 text-sm text-muted">
              Bất động sản, căn/phòng, tin đăng và kỳ thuê ở cùng một nơi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/owner/properties"
                className="rounded-xl border border-line-brand px-4 py-2 text-sm font-semibold text-brand-deep"
              >
                Bất động sản
              </Link>
              <Link
                href="/owner/listings"
                className="rounded-xl border border-line-brand px-4 py-2 text-sm font-semibold text-brand-deep"
              >
                Tin đăng
              </Link>
              <Link
                href="/owner/tenancies"
                className="rounded-xl border border-line-brand px-4 py-2 text-sm font-semibold text-brand-deep"
              >
                Kỳ thuê
              </Link>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function StatusLink({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
    >
      <span>{title}</span>
      <Badge tone={count > 0 ? "warning" : "neutral"}>{count}</Badge>
    </Link>
  );
}

function SummaryCard({
  title,
  count,
  detail,
  href,
  tone,
}: {
  title: string;
  count: number;
  detail: string;
  href: string;
  tone: "blue" | "amber";
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-white p-4 transition-colors hover:bg-slate-50 ${
        tone === "amber" ? "border-amber-200" : "border-line"
      }`}
    >
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-2xl font-bold">{count}</p>
      <p className="mt-2 text-xs text-brand">{detail} →</p>
    </Link>
  );
}

function AttentionLink({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 hover:bg-slate-50"
    >
      <span className="text-sm">{title}</span>
      <Badge tone={count > 0 ? "warning" : "neutral"}>{count}</Badge>
    </Link>
  );
}
