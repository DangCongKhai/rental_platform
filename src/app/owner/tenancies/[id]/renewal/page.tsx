import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenancy } from "@/server/tenancies/read";
import { RenewalProposalForm } from "@/components/tenancies/renewal-proposal-form";

export default async function RenewalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ requestId?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tenancy = await getTenancy(id);
  if (!tenancy?.isOwner) notFound();
  const request = tenancy.renewalRequests.find((item) => item.id === query.requestId && item.status === "PENDING");
  if (!request) notFound();
  return <section className="mx-auto max-w-3xl space-y-5">
    <Link className="text-sm font-semibold text-brand" href={`/owner/tenancies/${id}`}>← Quay lại kỳ thuê</Link>
    <header><p className="text-sm text-muted">{tenancy.unitLabel} · {tenancy.propertyName}</p><h1 className="text-[28px] font-bold">Đề xuất gia hạn</h1></header>
    <RenewalProposalForm tenancyId={id} requestId={request.id} requestedEndDate={request.requestedEndDate.toISOString().slice(0, 10)} requestedRent={request.proposedMonthlyRent} />
  </section>;
}
