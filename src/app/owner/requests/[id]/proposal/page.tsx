import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { getOwnerRentalRequest } from "@/server/tenancies/read";
import { ContractForm } from "@/components/tenancies/contract-form";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải đề xuất..."
          className="min-h-80 w-full"
        />
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const r = await getOwnerRentalRequest((await params).id);
  if (!r || r.status !== "PENDING") notFound();
  return (
    <section className="max-w-[1100px] space-y-6">
      <p className="text-sm text-brand">
        Yêu cầu thuê / {r.contactName} / Tạo đề xuất
      </p>
      <h1 className="text-[28px] font-bold">
        Tạo đề xuất thuê cho {r.contactName}
      </h1>
      <ContractForm
        id={r.id}
        units={r.units}
        preferredUnitId={r.preferredUnitId}
        startDate={r.desiredMoveInDate.toISOString().slice(0, 10)}
        endDate={r.desiredEndDate.toISOString().slice(0, 10)}
      />
    </section>
  );
}
