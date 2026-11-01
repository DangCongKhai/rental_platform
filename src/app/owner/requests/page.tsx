import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import {
  getOwnerRequests,
  OWNER_REQUEST_STATUSES,
  type OwnerRequestStatus,
} from "@/server/owner-requests";

export const instant = false;

const statusLabels: Record<OwnerRequestStatus, string> = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  WITHDRAWN: "Đã rút lại",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function requestPeriod(start: Date, end: Date) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function locationLine(property: { ward: string | null; city: string | null }) {
  return [property.ward, property.city].filter(Boolean).join(", ") || "Chưa có địa chỉ";
}

function statusClass(status: string) {
  if (status === "ACCEPTED") return "bg-[#dff3e5] text-[#287540]";
  if (status === "REJECTED" || status === "WITHDRAWN") return "bg-[#fde4e1] text-danger-ink";
  return "bg-[#fff0c9] text-[#865500]";
}

function filteredHref(status: OwnerRequestStatus, propertyId?: string) {
  const query = new URLSearchParams({ status });
  if (propertyId) query.set("propertyId", propertyId);
  return `/owner/requests?${query.toString()}`;
}

export default async function OwnerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; propertyId?: string }>;
}) {
  const query = await searchParams;
  const selectedStatus = OWNER_REQUEST_STATUSES.find((status) => status === query.status) ?? "PENDING";
  const { ownerName, properties, requests, filters, counts } = await getOwnerRequests({
    status: selectedStatus,
    propertyId: query.propertyId === "ALL" ? undefined : query.propertyId,
  });
  const selectedProperty = properties.find((property) => property.id === filters.propertyId);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">Yêu cầu thuê</h1>
        <form method="get" className="flex flex-wrap items-center justify-end gap-2 text-sm text-subtle">
          <input type="hidden" name="status" value={selectedStatus} />
          <span className="hidden md:inline">Chủ nhà: {ownerName} ·</span>
          <label htmlFor="request-property-filter" className="sr-only">Lọc theo bất động sản</label>
          <select
            id="request-property-filter"
            name="propertyId"
            defaultValue={filters.propertyId ?? "ALL"}
            className="min-h-10 max-w-[min(18rem,80vw)] rounded-xl border border-line-brand bg-white px-3 pr-9 text-sm text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <option value="ALL">Tất cả bất động sản</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
          <button type="submit" className={buttonClass({ variant: "secondary", className: "min-h-10 px-3 text-sm" })}>
            Lọc
          </button>
        </form>
      </header>

      {selectedProperty && (
        <p className="-mt-3 text-sm text-subtle md:hidden">
          Đang xem yêu cầu cho {selectedProperty.name}
        </p>
      )}

      <nav aria-label="Lọc yêu cầu theo trạng thái" className="flex gap-1 overflow-x-auto border-b border-line">
        {OWNER_REQUEST_STATUSES.map((status) => {
          const active = status === selectedStatus;
          return (
            <Link
              key={status}
              href={filteredHref(status, filters.propertyId)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${active ? "border-brand text-brand-deep" : "border-transparent text-ink-3 hover:border-line-brand hover:text-ink"}`}
            >
              {statusLabels[status]}
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-brand text-white" : "bg-[#e8ebf0] text-ink-3"}`}>
                {counts[status]}
              </span>
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Hộp thư trống</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">
            {properties.length ? "Chưa có yêu cầu ở trạng thái này" : "Chưa có bất động sản"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-subtle">
            {properties.length
              ? "Yêu cầu thuê gửi đến các tin đăng của bạn sẽ xuất hiện tại đây."
              : "Tạo bất động sản và tin đăng để nhận yêu cầu thuê từ khách."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f2f5f9] text-[13px] font-semibold text-ink-3">
                  <th scope="col" className="px-5 py-3.5">Người thuê</th>
                  <th scope="col" className="px-5 py-3.5">Bất động sản · căn ưu tiên</th>
                  <th scope="col" className="px-5 py-3.5">Ngày mong muốn</th>
                  <th scope="col" className="px-5 py-3.5">Đã chờ</th>
                  <th scope="col" className="px-5 py-3.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-line-soft align-middle hover:bg-[#fbfcfe]">
                    <td className="px-5 py-4">
                      <Link href={`/owner/requests/${request.id}`} className="font-semibold text-ink hover:text-brand-deep hover:underline">
                        {request.contactName || request.tenant.fullName}
                      </Link>
                      <a href={`tel:${request.contactPhone}`} className="mt-1 block text-sm font-semibold text-brand-deep hover:underline">
                        {request.contactPhone}
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/owner/requests/${request.id}`} className="block text-sm font-medium text-ink-2 hover:text-brand-deep">
                        {request.listing.property.name}
                      </Link>
                      <p className="mt-1 text-xs text-subtle">
                        {request.preferredUnit ? `Ưu tiên: ${request.preferredUnit.label}` : "Không ưu tiên căn/phòng"}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">{locationLine(request.listing.property)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-ink-2">
                      {requestPeriod(request.desiredMoveInDate, request.desiredEndDate)}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-ink-2">
                      {request.status === "PENDING" ? `${request.daysWaiting} ngày` : formatDate(request.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/owner/requests/${request.id}`} className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                        {statusLabels[request.status as OwnerRequestStatus]}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {requests.map((request) => (
              <li key={request.id}>
                <Link href={`/owner/requests/${request.id}`} className="block rounded-2xl border border-line bg-white p-4 focus-visible:outline-2 focus-visible:outline-brand">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-ink">{request.contactName || request.tenant.fullName}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                      {statusLabels[request.status as OwnerRequestStatus]}
                    </span>
                  </div>
                  <span className="mt-1 block text-sm font-semibold text-brand-deep">{request.contactPhone}</span>
                  <p className="mt-3 text-sm text-ink-2">{request.listing.property.name} · {request.preferredUnit?.label ?? "Không ưu tiên"}</p>
                  <p className="mt-1 text-sm text-subtle">{requestPeriod(request.desiredMoveInDate, request.desiredEndDate)}</p>
                  <p className="mt-2 text-xs text-subtle">{locationLine(request.listing.property)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {requests.length > 0 && (
        <p className="text-sm text-subtle">Sắp xếp yêu cầu mới nhất trước. Mở một yêu cầu để xem chi tiết và liên hệ người thuê.</p>
      )}
    </section>
  );
}
