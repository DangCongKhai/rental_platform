import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { TenancyScreen } from "@/components/tenancies/tenancy-screen";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải kỳ thuê..."
          className="min-h-80 w-full"
        />
      }
    >
      <TenancyScreen params={params} />
    </Suspense>
  );
}
