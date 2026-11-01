import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getMyProperties } from "@/server/properties";

export const instant = false;

const moderationLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};
const publicationLabels: Record<string, string> = { DRAFT: "Chưa đăng", PUBLISHED: "Đang công khai", HIDDEN: "Đã ẩn" };

export default async function OwnerListingsPage() {
  const properties = await getMyProperties();
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight text-ink">Tin đăng</h1>
        <p className="mt-1 text-sm text-subtle">Soạn tin, gửi xét duyệt và quản lý trạng thái công khai.</p>
      </header>
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">Chưa có bất động sản để đăng tin</h2>
          <p className="mt-2 text-sm text-subtle">Tạo bất động sản trước, sau đó chuẩn bị tin đăng tại đây.</p>
          <Link href="/owner/properties/new" className={`${buttonClass()} mt-4`}>Tạo bất động sản</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {properties.map((property) => {
            const listing = property.listings[0];
            return (
              <li key={property.id} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{property.name}</h2>
                    <p className="mt-1 text-sm text-subtle">{[property.ward, property.city].filter(Boolean).join(", ") || property.addressLine || "Chưa thêm địa chỉ"}</p>
                    {listing ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-deep">{moderationLabels[listing.moderationStatus] ?? listing.moderationStatus}</span>
                        <span className="rounded-full bg-surface px-3 py-1 font-semibold text-ink-2">{publicationLabels[listing.publicationStatus] ?? listing.publicationStatus}</span>
                        {listing.adminSuspendedAt && <span className="rounded-full bg-[#fdf2f1] px-3 py-1 font-semibold text-danger-ink">Bị đình chỉ bởi quản trị viên</span>}
                      </div>
                    ) : <p className="mt-3 text-sm text-subtle">Chưa có tin đăng</p>}
                  </div>
                  {listing ? (
                    <Link href={`/owner/listings/${listing.id}`} className={buttonClass({ variant: "secondary" })}>Quản lý tin đăng</Link>
                  ) : (
                    <Link href={`/owner/listings/new?propertyId=${property.id}`} className={buttonClass()}>Tạo tin đăng</Link>
                  )}
                </div>
                {listing?.moderationStatus === "REJECTED" && listing.reviewReason && <p className="mt-4 rounded-xl border border-danger/30 bg-[#fff8f7] p-3 text-sm text-danger-ink">Lý do từ chối: {listing.reviewReason}</p>}
                {listing?.adminSuspendedAt && listing.suspensionReason && <p className="mt-4 rounded-xl border border-danger/30 bg-[#fff8f7] p-3 text-sm text-danger-ink">Lý do đình chỉ: {listing.suspensionReason}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
