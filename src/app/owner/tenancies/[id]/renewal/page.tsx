import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenancy } from "@/server/tenancies/read";
import { RenewalProposalForm } from "@/components/tenancies/renewal-proposal-form";

export default function RenewalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ requestId?: string }> }) {
  return (
    <Suspense
      fallback={
        <section
          aria-busy="true"
          className="mx-auto min-h-80 max-w-3xl animate-pulse rounded-2xl border border-line bg-white p-6"
        >
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-5 h-8 w-56 rounded bg-slate-200" />
          <div className="mt-8 h-48 rounded-xl bg-slate-100" />
        </section>
      }
    >
      <RenewalPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RenewalPageContent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ requestId?: string }> }) {
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
