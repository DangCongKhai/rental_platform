import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UnitEditor } from "../../../../components/unit-editor";
import { ownerUnitArrangement } from "@/server/properties";

export default function EditOwnerUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="px-1 py-6 text-sm text-slate-500">
          Đang tải phòng…
        </p>
      }
    >
      <OwnerUnitEditor params={params} />
    </Suspense>
  );
}

async function OwnerUnitEditor({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  const arrangement = await ownerUnitArrangement(id, unitId);
  if (arrangement === "WHOLE_SPACE") {
    redirect(`/owner/properties/${id}/edit`);
  }
  return <UnitEditor propertyId={id} unitId={unitId} />;
}
