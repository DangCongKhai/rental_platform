import { notFound, redirect } from "next/navigation";
import { ListingEditor } from "../listing-editor";
import { getOwnerListingEditor } from "@/server/listings/owner-listing-editor";

export const instant = false;

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ propertyId?: string; returnTo?: string }> }) {
  const { propertyId, returnTo: requestedReturnTo } = await searchParams;
  if (!propertyId) redirect("/owner/listings");
  const data = await getOwnerListingEditor(propertyId);
  if (!data) notFound();
  const propertyUnitsPath = `/owner/properties/${data.property.id}/units`;
  const returnTo = requestedReturnTo === propertyUnitsPath ? propertyUnitsPath : undefined;
  if (data.listing) {
    redirect(`/owner/listings/${data.listing.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  }
  return <ListingEditor key={data.property.id} initialData={data} returnTo={returnTo} />;
}
