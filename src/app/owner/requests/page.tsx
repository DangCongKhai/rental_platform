import Link from "next/link";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { requestDate } from "@/components/tenant/request-status";
import {
  getOwnerRequests,
  type OwnerRequestTab,
} from "@/server/tenancies/read";

const tabs: { id: OwnerRequestTab; label: string }[] = [
  { id: "pending", label: "Đang chờ" },
  { id: "accepted", label: "Đã chấp nhận" },
  { id: "rejected", label: "Đã từ chối" },
  { id: "withdrawn", label: "Đã rút lại" },
];

const statusLabels: Record<string, string> = {
  PENDING: "Đang chờ xử lý",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  WITHDRAWN: "Đã rút lại",
};

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000
    ? parsed
    : 1;
}

function tabOf(value: string | undefined): OwnerRequestTab {
  return tabs.some((tab) => tab.id === value)
    ? (value as OwnerRequestTab)
    : "pending";
}

function href(tab: string, page: number | undefined, property: string) {
  const params = new URLSearchParams();
  if (tab !== "pending") params.set("tab", tab);
  if (property) params.set("property", property);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/owner/requests?${query}` : "/owner/requests";
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysWaiting(createdAt: Date) {
  const days = Math.round(
    (Date.parse(dayKey(new Date())) - Date.parse(dayKey(createdAt))) / 86400000,
  );
  return Math.max(0, days);
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; property?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải yêu cầu..."
          className="min-h-80 w-full"
        />
      }
    >
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; property?: string }>;
}) {
  const query = await searchParams;
  const tab = tabOf(query.tab);
  const page = pageNumber(query.page);
  const result = await getOwnerRequests({
    tab,
    page,
    propertyId: query.property,
  });
  const today = dayKey(new Date());
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold">Yêu cầu thuê</h1>
        <p className="mt-1 text-sm text-muted">
          Chỉ các yêu cầu cho bất động sản của bạn. Mở một hàng không đổi trạng
          thái.
        </p>
      </header>
      <nav aria-label="Trạng thái yêu cầu" className="flex flex-wrap gap-1">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={href(item.id, undefined, result.propertyId)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${tab === item.id ? "bg-brand text-white" : "bg-white text-ink"}`}
          >
            {item.label}
            {item.id === "pending" && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {result.pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <form action="/owner/requests" className="flex flex-wrap items-end gap-3">
        {tab !== "pending" && <input type="hidden" name="tab" value={tab} />}
        <label className="text-sm font-semibold text-ink">
          Bất động sản
          <select
            name="property"
            defaultValue={result.propertyId}
            className="mt-1 block min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal"
          >
            <option value="">Tất cả</option>
            {result.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          Lọc
        </button>
      </form>
      {result.requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Không có yêu cầu trong mục này.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                {[
                  "Người thuê",
                  "Bài đăng",
                  "Căn ưu tiên",
                  "Ngày mong muốn",
                  "Đã chờ",
                  "Trạng thái",
                ].map((label) => (
                  <th key={label} className="px-4 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.requests.map((request) => {
                const moveInPassed =
                  request.status === "PENDING" &&
                  dayKey(request.desiredMoveInDate) < today;
                return (
                  <tr key={request.id} className="border-t border-line">
                    <td className="px-4 py-4">
                      <Link
                        href={`/owner/requests/${request.id}`}
                        className="font-semibold text-ink"
                      >
                        {request.status === "PENDING" && (
                          <span
                            aria-label="Cần xử lý"
                            className="mr-2 inline-block size-2.5 rounded-full bg-brand align-middle"
                          />
                        )}
                        {request.contactName}
                      </Link>
                      <p className="mt-1 text-muted">{request.contactPhone}</p>
                    </td>
                    <td className="px-4 py-4">{request.listing.title}</td>
                    <td className="px-4 py-4">
                      {request.preferredUnit?.label ?? "Không ưu tiên"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {requestDate(request.desiredMoveInDate)} –{" "}
                      {requestDate(request.desiredEndDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {daysWaiting(request.createdAt)} ngày
                    </td>
                    <td className="px-4 py-4">
                      <p>{statusLabels[request.status] ?? request.status}</p>
                      {moveInPassed && (
                        <p className="mt-1 text-danger-ink">
                          Ngày dọn vào mong muốn đã qua
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted">
        Sắp xếp mục cũ nhất lên trước. Nhấn vào tên người thuê để xem chi tiết.
      </p>
      {result.total > result.pageSize && (
        <nav aria-label="Phân trang" className="flex items-center gap-5 text-sm">
          {page > 1 && (
            <Link href={href(tab, page - 1, result.propertyId)}>Trang trước</Link>
          )}
          <span>
            Trang {page} · {result.total} yêu cầu
          </span>
          {page * result.pageSize < result.total && (
            <Link href={href(tab, page + 1, result.propertyId)}>Trang sau</Link>
          )}
        </nav>
      )}
    </section>
  );
}
