import Link from "next/link";
import { PageLinks } from "@/components/page-links";
import { buttonClass } from "@/components/ui/button";
import { getMyProperties } from "@/server/properties";

export const instant = false;

const moderationStatuses = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

const publicationStatuses = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

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
  searchParams: Promise<{
    page?: string;
    moderationStatus?: string;
    publicationStatus?: string;
    suspended?: string;
  }>;
}) {
  const {
    page: pageValue,
    moderationStatus: moderationStatusValue,
    publicationStatus: publicationStatusValue,
    suspended: suspendedValue,
  } = await searchParams;

  const parsed = Number(pageValue);
  const page =
    Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;

  const moderationStatus = moderationStatuses.find(
    (status) => status === moderationStatusValue,
  );

  const publicationStatus = publicationStatuses.find(
    (status) => status === publicationStatusValue,
  );

  const suspended = suspendedValue === "1" ? true : undefined;

  const filters = {
    moderationStatus,
    publicationStatus,
    suspended,
  };

  const result = await getMyProperties(false, page, filters);
  const properties = result.properties;

  function filterUrl(overrides: {
    moderationStatus?: (typeof moderationStatuses)[number] | null;
    publicationStatus?: (typeof publicationStatuses)[number] | null;
    suspended?: boolean | null;
  }) {
    const params = new URLSearchParams();

    const nextModeration =
      overrides.moderationStatus !== undefined
        ? overrides.moderationStatus
        : moderationStatus;

    const nextPublication =
      overrides.publicationStatus !== undefined
        ? overrides.publicationStatus
        : publicationStatus;

    const nextSuspended =
      overrides.suspended !== undefined ? overrides.suspended : suspended;

    if (nextModeration !== undefined && nextModeration !== null) {
      params.set("moderationStatus", nextModeration);
    }

    if (nextPublication !== undefined && nextPublication !== null) {
      params.set("publicationStatus", nextPublication);
    }

    if (nextSuspended === true) {
      params.set("suspended", "1");
    }

    const query = params.toString();

    return query ? `/owner/listings?${query}` : "/owner/listings";
  }

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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-4">
        <span className="mr-1 text-sm font-medium text-ink">Kiểm duyệt:</span>

        <Link
          href={filterUrl({ moderationStatus: null })}
          className={buttonClass({
            variant: moderationStatus ? "secondary" : "primary",
            size: "md",
          })}
        >
          Tất cả
        </Link>

        {moderationStatuses.map((status) => (
          <Link
            key={status}
            href={filterUrl({ moderationStatus: status })}
            className={buttonClass({
              variant: moderationStatus === status ? "primary" : "secondary",
              size: "md",
            })}
          >
            {moderationLabels[status]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-4">
        <span className="mr-1 text-sm font-medium text-ink">Công khai:</span>

        <Link
          href={filterUrl({ publicationStatus: null })}
          className={buttonClass({
            variant: publicationStatus ? "secondary" : "primary",
            size: "md",
          })}
        >
          Tất cả
        </Link>

        {publicationStatuses.map((status) => (
          <Link
            key={status}
            href={filterUrl({ publicationStatus: status })}
            className={buttonClass({
              variant: publicationStatus === status ? "primary" : "secondary",
              size: "md",
            })}
          >
            {publicationLabels[status]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-4">
        <span className="mr-1 text-sm font-medium text-ink">Đình chỉ:</span>

        <Link
          href={filterUrl({ suspended: null })}
          className={buttonClass({
            variant: suspended ? "secondary" : "primary",
            size: "md",
          })}
        >
          Tất cả
        </Link>

        <Link
          href={filterUrl({ suspended: true })}
          className={buttonClass({
            variant: suspended ? "primary" : "secondary",
            size: "md",
          })}
        >
          Bị đình chỉ
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">
            {moderationStatus || publicationStatus || suspended
              ? "Không tìm thấy tin đăng phù hợp"
              : "Chưa có bất động sản để đăng tin"}
          </h2>

          <p className="mt-2 text-sm text-subtle">
            {moderationStatus || publicationStatus || suspended
              ? "Thử thay đổi hoặc xóa bộ lọc để xem thêm kết quả."
              : "Tạo bất động sản trước, sau đó chuẩn bị tin đăng tại đây."}
          </p>

          {moderationStatus || publicationStatus || suspended ? (
            <Link
              href="/owner/listings"
              className={`${buttonClass({ variant: "secondary" })} mt-4`}
            >
              Xóa bộ lọc
            </Link>
          ) : (
            <Link
              href="/owner/properties/new"
              className={`${buttonClass()} mt-4`}
            >
              Tạo bất động sản
            </Link>
          )}
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
          href={(nextPage) => {
            const params = new URLSearchParams();

            if (moderationStatus) {
              params.set("moderationStatus", moderationStatus);
            }

            if (publicationStatus) {
              params.set("publicationStatus", publicationStatus);
            }

            if (suspended) {
              params.set("suspended", "1");
            }

            if (nextPage > 1) {
              params.set("page", String(nextPage));
            }

            const query = params.toString();

            return query ? `/owner/listings?${query}` : "/owner/listings";
          }}
        />
      </div>
    </section>
  );
}
