import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { PageLinks } from "@/components/page-links";
import { TenancyTable } from "@/components/tenancies/tenancy-table";
import { getOwnerTenancies } from "@/server/tenancies/read";

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000
    ? parsed
    : 1;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải kỳ thuê..."
          className="min-h-80 w-full"
        />
      }
    >
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const result = await getOwnerTenancies(page);
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold">Kỳ thuê và hợp đồng</h1>
        <p className="mt-1 text-sm text-muted">
          Ngày dọn vào và dọn ra, giá thuê, tiền cọc và phiên bản hợp đồng của
          từng kỳ thuê.
        </p>
      </header>
      {result.tenancies.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Chưa có kỳ thuê.
        </p>
      ) : (
        <TenancyTable tenancies={result.tenancies} party="owner" />
      )}
      <div className="flex justify-end">
        <PageLinks
          page={result.page}
          total={result.total}
          pageSize={result.pageSize}
          href={(nextPage) =>
            nextPage > 1
              ? `/owner/tenancies?page=${nextPage}`
              : "/owner/tenancies"
          }
        />
      </div>
    </section>
  );
}
