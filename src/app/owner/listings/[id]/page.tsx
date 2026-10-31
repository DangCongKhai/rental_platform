import { notFound } from "next/navigation";
import { ListingEditor } from "../listing-editor";
import { getOwnerListingEditorById } from "@/server/listings/owner-listing-editor";

export const instant = false;

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOwnerListingEditorById(id);
  if (!data?.listing || data.listing.id !== id) notFound();
  return <ListingEditor initialData={data} />;
}
