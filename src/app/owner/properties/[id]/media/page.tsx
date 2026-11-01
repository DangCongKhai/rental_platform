import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { getPropertyMedia } from "@/server/property-media";
import { getMyProperty } from "@/server/properties";
import { PropertyMediaManager } from "./property-media-manager";

export const instant = false;

export default async function PropertyMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getMyProperty(id);
  if (!property) notFound();

  const [media, latestListing] = await Promise.all([
    getPropertyMedia(property.id),
    prisma.listing.findFirst({
      where: { propertyId: property.id, archivedAt: null },
      orderBy: [{ publicationStatus: "desc" }, { updatedAt: "desc" }],
      select: { coverMediaId: true },
    }),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav aria-label="Đường dẫn" className="mb-2 text-sm text-subtle">
            <Link href="/owner/properties" className="hover:text-brand">Bất động sản</Link>
            <span aria-hidden="true"> / </span>
            <Link href={`/owner/properties/${property.id}`} className="hover:text-brand">{property.name}</Link>
            <span aria-hidden="true"> / </span>
            <span>Hình ảnh</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Hình ảnh bất động sản</h1>
          <p className="mt-1 text-sm text-subtle">{property.rentalArrangement === "WHOLE_SPACE"
            ? "Tải ảnh cho toàn bộ bất động sản. Ảnh đã chọn sẽ dùng cho tin đăng."
            : "Tải ảnh cho bất động sản hoặc từng căn/phòng, sắp xếp và chọn ảnh bìa."}</p>
        </div>
        <Link href={`/owner/properties/${property.id}/units`} className={buttonClass({ variant: "secondary" })}>
          Quản lý căn/phòng
        </Link>
      </header>

      <PropertyMediaManager
        propertyId={property.id}
        isWholeSpace={property.rentalArrangement === "WHOLE_SPACE"}
        units={property.units.map((unit) => ({ id: unit.id, label: unit.label }))}
        initialMedia={media}
        initialCoverMediaId={latestListing?.coverMediaId ?? null}
      />
    </section>
  );
}
