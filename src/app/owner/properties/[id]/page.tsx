import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { getPropertyRental } from "@/server/properties";
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
  const property = await getPropertyRental((await params).id);
  if (!property) notFound();
  return <PropertyRental property={property} />;
}
