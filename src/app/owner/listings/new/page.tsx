import { notFound, redirect } from "next/navigation";
import { ListingEditor } from "../listing-editor";
import { getOwnerListingEditor } from "@/server/listings/owner-listing-editor";

export const instant = false;

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const { propertyId } = await searchParams;
  if (!propertyId) redirect("/owner/listings");
  const data = await getOwnerListingEditor(propertyId);
  if (!data) notFound();
  if (data.listing) redirect(`/owner/listings/${data.listing.id}`);
  return <ListingEditor initialData={data} />;
}
