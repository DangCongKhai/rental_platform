import Link from "next/link";
import { PageLinks } from "@/components/page-links";
import { buttonClass } from "@/components/ui/button";
import { getMyProperties } from "@/server/properties";

export const instant = false;

const moderationLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};
const publicationLabels: Record<string, string> = {
  DRAFT: "Chưa đăng",
  PUBLISHED: "Đang công khai",
  HIDDEN: "Đã ẩn",
};

export default async function OwnerListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const parsed = Number((await searchParams).page);
  const page =
    Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  const result = await getMyProperties(false, page);
  const properties = result.properties;
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight text-ink">
          Tin đăng
        </h1>
        <p className="mt-1 text-sm text-subtle">
          Soạn tin, gửi xét duyệt và quản lý trạng thái công khai.
        </p>
      </header>
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">
            Chưa có bất động sản để đăng tin
          </h2>
          <p className="mt-2 text-sm text-subtle">
            Tạo bất động sản trước, sau đó chuẩn bị tin đăng tại đây.
          </p>
          <Link
            href="/owner/properties/new"
            className={`${buttonClass()} mt-4`}
          >
            Tạo bất động sản
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[15px] border border-line bg-white">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f7f9fb] text-[13px] font-semibold text-subtle">
                <th scope="col" className="px-4 py-4 font-semibold">
                  Bất động sản
                </th>
                <th scope="col" className="px-4 py-4 font-semibold">
                  Kiểm duyệt
                </th>
                <th scope="col" className="px-4 py-4 font-semibold">
                  Công khai
                </th>
                <th scope="col" className="px-4 py-4 font-semibold">
                  Ghi chú
                </th>
                <th scope="col" className="px-4 py-4">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const listing = property.listings[0];
                const place =
                  [property.ward, property.city].filter(Boolean).join(", ") ||
                  property.addressLine ||
                  "Chưa thêm địa chỉ";
                const note = listing?.adminSuspendedAt
                  ? listing.suspensionReason
                  : listing?.moderationStatus === "REJECTED"
                    ? listing.reviewReason
                    : null;
                return (
                  <tr
                    key={property.id}
                    className="border-t border-line-soft align-middle"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-[15px] font-semibold leading-snug text-ink-2">
                        {property.name}
                      </p>
                      <p className="mt-0.5 max-w-[240px] text-[13px] leading-5 text-subtle">
                        {place}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-ink">
                      {listing
                        ? (moderationLabels[listing.moderationStatus] ??
                          listing.moderationStatus)
                        : "Chưa có tin"}
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-ink">
                      {listing ? (
                        <span>
                          {publicationLabels[listing.publicationStatus] ??
                            listing.publicationStatus}
                          {listing.adminSuspendedAt ? " · Bị đình chỉ" : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-danger-ink">
                      {note ?? <span className="text-subtle">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {listing ? (
                        <Link
                          href={`/owner/listings/${listing.id}`}
                          className={buttonClass({ variant: "secondary" })}
                        >
                          Quản lý tin đăng
                        </Link>
                      ) : (
                        <Link
                          href={`/owner/listings/new?propertyId=${property.id}`}
                          className={buttonClass()}
                        >
                          Tạo tin đăng
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end">
        <PageLinks
          page={page}
          total={result.total}
          pageSize={result.pageSize}
          href={(nextPage) =>
            nextPage > 1
              ? `/owner/listings?page=${nextPage}`
              : "/owner/listings"
          }
        />
      </div>
    </section>
  );
}
