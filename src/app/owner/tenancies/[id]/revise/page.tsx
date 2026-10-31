import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { getTenancy } from "@/server/tenancies/read";
import { ContractForm } from "@/components/tenancies/contract-form";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải hợp đồng..."
          className="min-h-80 w-full"
        />
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTenancy((await params).id);
  if (
    !t ||
    !t.isOwner ||
    t.currentTerms ||
    !["PENDING_CONFIRMATION", "AWAITING_REVISION", "EXPIRED"].includes(t.status)
  )
    notFound();
  const c = t.contracts[0];
  return (
    <section className="max-w-[1100px] space-y-6">
      <p className="text-sm text-brand">
        Kỳ thuê / {t.unitLabel} / Phiên bản sửa đổi
      </p>
      <h1 className="text-[28px] font-bold">
        Tạo phiên bản {c.versionNumber + 1}
      </h1>
      {c.tenantRejectionReason && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          Lý do từ chối: {c.tenantRejectionReason}
        </p>
      )}
      <ContractForm
        revision
        id={t.id}
        units={[
          {
            id: t.unitId,
            label: t.unitLabel,
            operationalStatus: "READY",
            monthlyRent: c.monthlyRent,
            depositAmount: c.depositAmount,
          },
        ]}
        preferredUnitId={t.unitId}
        startDate={c.startDate.toISOString().slice(0, 10)}
        endDate={c.endDate.toISOString().slice(0, 10)}
        monthlyRent={c.monthlyRent}
        depositAmount={c.depositAmount}
      />
    </section>
  );
}
