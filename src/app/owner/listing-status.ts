import type { OwnerPropertyListingSummary } from "@/lib/owner-types";

export function listingStatusClass(
  listing: OwnerPropertyListingSummary | null,
): string {
  const base = [
    "inline-flex rounded-full px-2.5 py-1",
    "text-xs font-semibold whitespace-nowrap",
  ].join(" ");
  if (!listing) return `${base} bg-slate-100 text-slate-700`;
  if (listing.admin_suspended_at) {
    return `${base} bg-rose-100 text-rose-800`;
  }
  if (listing.publication_status === "PUBLISHED") {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  if (listing.publication_status === "HIDDEN") {
    return `${base} bg-slate-200 text-slate-700`;
  }
  if (listing.moderation_status === "PENDING") {
    return `${base} bg-amber-100 text-amber-950`;
  }
  if (listing.moderation_status === "REJECTED") {
    return `${base} bg-rose-100 text-rose-800`;
  }
  if (listing.moderation_status === "APPROVED") {
    return `${base} bg-sky-100 text-sky-950`;
  }
  return `${base} bg-slate-100 text-slate-600`;
}
