import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { getAmenityCatalog } from "@/domain/amenities";
import { getMyProperty, getPropertyRental } from "@/server/properties";
import { toOwnerPropertyDetail } from "@/server/owner-api/shared";
import { PropertyRental } from "./property-rental";

export default function OwnerPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải bất động sản..."
          className="min-h-80 w-full"
        />
      }
    >
      <OwnerPropertyDetail params={params} />
    </Suspense>
  );
}

async function OwnerPropertyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const [property, record] = await Promise.all([
    getPropertyRental(id),
    getMyProperty(id),
  ]);
  if (!property || !record) notFound();
  const amenityLabels = Object.fromEntries(
    getAmenityCatalog().map((item) => [item.key, item.label]),
  );
  return (
    <PropertyRental
      property={property}
      detail={toOwnerPropertyDetail(record)}
      amenityLabels={amenityLabels}
    />
  );
}
