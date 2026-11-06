import Link from "next/link";
import { connection } from "next/server";
import { buttonClass } from "@/components/ui/button";
import { formatVietnamDate } from "@/lib/vietnam-date";
import { getAdminListings } from "@/server/admin/listings";
import { ListingSuspensionControls } from "./listing-suspension-controls";

export const instant = false;

const publicationLabel: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang công khai",
  HIDDEN: "Đã ẩn",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const listings = await getAdminListings({
    page: Number.parseInt(params.page ?? "1", 10) || 1,
    q: params.q,
    status: params.status,
  });
  const href = (page: number) =>
    `/admin/listings?page=${page}&status=${listings.status}${listings.search ? `&q=${encodeURIComponent(listings.search)}` : ""}`;
  return (
    <div className="w-full space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#bd7900]">
            Quản lý nội dung
          </p>
          <h1 className="mt-1 text-3xl font-bold">Danh sách tin đăng</h1>
          <p className="mt-1 text-sm text-[#627184]">
            Tìm tin đăng, đình chỉ nội dung vi phạm hoặc khôi phục tin đã kiểm
            tra.
          </p>
        </div>
        <form action="/admin/listings" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={listings.search}
            placeholder="Tìm tiêu đề, bất động sản, chủ nhà"
            aria-label="Tìm tin đăng"
            className="min-h-10 w-64 rounded-lg border border-[#cad4df] bg-white px-3 text-sm outline-none focus:border-[#376da5]"
          />
          <select
            name="status"
            defaultValue={listings.status}
            aria-label="Lọc trạng thái"
            className="min-h-10 rounded-lg border border-[#cad4df] bg-white px-3 pr-9 text-sm"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đang công khai</option>
            <option value="HIDDEN">Đã ẩn</option>
            <option value="SUSPENDED">Đang đình chỉ</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
          <button
            className={buttonClass({
              className: "min-h-10 rounded-lg px-4 text-sm",
            })}
          >
            Lọc
          </button>
        </form>
      </header>
      <div className="overflow-x-auto rounded-xl border border-[#dce3eb] bg-white shadow-sm">
        <table className="w-full min-w-[1450px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[17%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-[#f7f9fb] text-xs uppercase tracking-wide text-[#627184]">
            <tr>
              {[
                "Tin đăng",
                "Bất động sản",
                "Chủ nhà",
                "Trạng thái",
                "Lý do đình chỉ",
                "Cập nhật",
                "Thao tác",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7ebf0]">
            {listings.rows.map((item) => (
              <tr key={item.id}>
                <td className="break-words px-4 py-4 font-semibold">
                  {item.title || "Chưa đặt tiêu đề"}
                  <p className="mt-1 text-xs font-normal text-[#718096]">
                    {item.moderationStatus === "APPROVED"
                      ? "Đã duyệt"
                      : item.moderationStatus === "PENDING"
                        ? "Đang xét duyệt"
                        : item.moderationStatus}
                  </p>
                </td>
                <td className="break-words px-4 py-4">{item.property.name}</td>
                <td className="break-words px-4 py-4">
                  {item.property.owner.fullName}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${item.archivedAt ? "bg-gray-100 text-gray-700" : item.adminSuspendedAt ? "bg-red-100 text-red-800" : "bg-[#edf3f8] text-[#284c70]"}`}
                  >
                    {item.archivedAt
                      ? "Đã lưu trữ"
                      : item.adminSuspendedAt
                        ? "Bị đình chỉ"
                        : (publicationLabel[item.publicationStatus] ??
                          item.publicationStatus)}
                  </span>
                </td>
                <td className="break-words px-4 py-4 text-sm text-[#627184]">
                  {item.suspensionReason ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs">
                  {formatVietnamDate(item.updatedAt)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {!item.archivedAt && (
                      <>
                        <Link
                          href={`/admin/reviews/${item.id}`}
                          className="shrink-0 pt-2 text-sm font-semibold text-[#1c4d78] hover:underline"
                        >
                          Chi tiết
                        </Link>
                        <ListingSuspensionControls
                          listingId={item.id}
                          suspended={Boolean(item.adminSuspendedAt)}
                        />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {listings.rows.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-semibold">
              {listings.search
                ? "Không tìm thấy tin đăng phù hợp."
                : "Chưa có tin đăng nào."}
            </p>
            <p className="mt-1 text-sm text-[#718096]">
              Tin đăng đã lưu trữ không xuất hiện trong danh sách này.
            </p>
          </div>
        )}
      </div>
      <footer className="flex items-center justify-between text-sm text-[#627184]">
        <span>
          {listings.total} tin đăng · Trang {listings.page}/{listings.pageCount}
        </span>
        <div className="flex gap-2">
          {listings.page > 1 && (
            <Link
              href={href(listings.page - 1)}
              className={buttonClass({
                variant: "secondary",
                className: "min-h-9 rounded-lg px-3 text-xs",
              })}
            >
              Trang trước
            </Link>
          )}
          {listings.page < listings.pageCount && (
            <Link
              href={href(listings.page + 1)}
              className={buttonClass({
                variant: "secondary",
                className: "min-h-9 rounded-lg px-3 text-xs",
              })}
            >
              Trang sau
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
