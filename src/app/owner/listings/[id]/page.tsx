import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ListingEditor } from "../listing-editor";
import { getOwnerListingEditorById } from "@/server/listings/owner-listing-editor";

export const instant = false;

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  await connection();
  const { id } = await params;
  const { returnTo: requestedReturnTo } = await searchParams;
  const data = await getOwnerListingEditorById(id);
  if (!data?.listing || data.listing.id !== id) notFound();
  const propertyUnitsPath = `/owner/properties/${data.property.id}/units`;
  const returnTo = requestedReturnTo === propertyUnitsPath ? propertyUnitsPath : undefined;
  return <ListingEditor key={data.listing.id} initialData={data} returnTo={returnTo} />;
}
