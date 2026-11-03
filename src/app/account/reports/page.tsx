import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { getMyReports } from "@/server/reports/report-listing";

import { ReportHistory } from "@/components/account/report-history";

export default function ReportsPage() {
  return (
    <section className="max-w-[1100px]">
      <h1 className="mb-5 text-[28px] font-bold leading-9 tracking-[-0.56px]">
        Báo cáo của tôi
      </h1>
      <Suspense
        fallback={
          <LoadingScreen
            message="Đang tải báo cáo..."
            className="min-h-80 w-full"
          />
        }
      >
        <ReportsContent />
      </Suspense>
    </section>
  );
}
async function ReportsContent() {
  const reports = await getMyReports();
  return <ReportHistory reports={reports} />;
}
