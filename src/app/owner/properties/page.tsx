import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyProperties } from "@/server/properties";
import { PropertyActions } from "./property-actions";

export const instant = false;

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const propertyTypeLabels: Record<string, string> = {
  HOUSE: "Nhà riêng",
  APARTMENT: "Căn hộ",
  APARTMENT_BUILDING: "Tòa nhà căn hộ",
};

const arrangementLabels: Record<string, string> = {
  WHOLE_SPACE: "Toàn bộ không gian",
  SEPARATE_UNITS: "Từng căn riêng lẻ",
};

const moderationBadges: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  PENDING: { label: "Chờ duyệt", tone: "neutral" },
  APPROVED: { label: "Đã duyệt", tone: "success" },
  REJECTED: { label: "Bị từ chối", tone: "danger" },
};

const publicationBadges: Record<string, { label: string; tone: "success" | "neutral" }> = {
  PUBLISHED: { label: "Đã đăng", tone: "success" },
  HIDDEN: { label: "Đã ẩn", tone: "neutral" },
};

const badgeClass = {
  success: "bg-success-soft text-success",
  danger: "bg-[#fdf2f1] text-danger-ink",
  neutral: "bg-[#e8ebf0] text-muted",
} as const;

function locationLine(property: {
  ward: string | null;
  district: string | null;
  addressLine: string | null;
  city: string | null;
}) {
  const place = [property.ward, property.district].filter(Boolean).join(", ");
  return place || property.addressLine || property.city || "Chưa thêm địa chỉ";
}

function StatusBadge({ label, tone }: { label: string; tone: keyof typeof badgeClass }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-5", badgeClass[tone])}>
      {label}
    </span>
  );
}

export default async function OwnerPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const properties = await getMyProperties(showArchived);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">Bất động sản</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={showArchived ? "/owner/properties" : "/owner/properties?archived=1"}
            aria-pressed={showArchived}
            className="inline-flex min-h-11 items-center gap-2.5 px-1.5 text-sm font-medium text-ink-3"
          >
            <span
              aria-hidden="true"
              className={cn("relative h-[26px] w-11 rounded-full", showArchived ? "bg-brand" : "bg-[#b9c3d0]")}
            >
              <span
                className={cn(
                  "absolute top-[3px] size-5 rounded-full bg-white",
                  showArchived ? "left-[21px]" : "left-[3px]",
                )}
              />
            </span>
            Hiện mục đã lưu trữ
          </Link>
          <Link href="/owner/properties/new" className={buttonClass()}>
            Tạo bất động sản
          </Link>
        </div>
      </header>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center rounded-[15px] border border-dashed border-line bg-white px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-ink">
            {showArchived ? "Không có bất động sản đã lưu trữ" : "Thêm bất động sản đầu tiên của bạn"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink">
            {showArchived
              ? "Các bất động sản bạn lưu trữ sẽ xuất hiện tại đây."
              : "Bắt đầu bằng thông tin cơ bản và địa chỉ, bạn có thể hoàn thiện sau."}
          </p>
          {!showArchived && (
            <Link href="/owner/properties/new" className={`${buttonClass()} mt-4`}>
              Thêm bất động sản
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[15px] border border-line bg-white">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="bg-[#f7f9fb] text-[13px] font-semibold text-subtle">
                <th scope="col" className="px-4 py-4 font-semibold">Tên và địa chỉ</th>
                <th scope="col" className="px-4 py-4 font-semibold">Loại</th>
                <th scope="col" className="px-4 py-4 font-semibold">Hình thức cho thuê</th>
                <th scope="col" className="w-16 px-4 py-4 font-semibold leading-snug">Số căn</th>
                <th scope="col" className="px-4 py-4 font-semibold">Tin đăng</th>
                <th scope="col" className="px-4 py-4 font-semibold">Cập nhật</th>
                <th scope="col" className="px-4 py-4">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const listing = property.listings[0];
                const moderation = listing ? moderationBadges[listing.moderationStatus] : undefined;
                const publication =
                  listing && listing.publicationStatus !== "DRAFT"
                    ? publicationBadges[listing.publicationStatus]
                    : undefined;

                return (
                  <tr key={property.id} className="border-t border-line-soft align-middle">
                    <td className="px-4 py-3.5">
                      <p className="text-[15px] font-semibold leading-snug text-ink-2">{property.name}</p>
                      <p className="mt-0.5 max-w-[220px] text-[13px] leading-5 text-subtle">{locationLine(property)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] text-ink">
                      {propertyTypeLabels[property.propertyType] ?? property.propertyType}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={arrangementLabels[property.rentalArrangement] ?? property.rentalArrangement}
                        tone="neutral"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-[15px] whitespace-nowrap text-ink">{property._count.units} căn</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-2">
                        {moderation ? <StatusBadge {...moderation} /> : <StatusBadge label="Chưa có tin" tone="neutral" />}
                        {publication && <StatusBadge {...publication} />}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[15px] whitespace-nowrap text-ink">
                      {dateFormatter.format(property.updatedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/owner/properties/${property.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-[15px] border border-ink px-2.5 text-[15px] font-semibold text-brand-deep hover:bg-brand-soft"
                        >
                          Chỉnh sửa
                        </Link>
                        {!showArchived && <PropertyActions propertyId={property.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
