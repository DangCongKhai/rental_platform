import Link from "next/link";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { getOwnerTenancies } from "@/server/tenancies/read";

const labels: Record<string, string> = {
  PENDING_CONFIRMATION: "Đang chờ xác nhận",
  AWAITING_REVISION: "Đang chờ phiên bản sửa đổi",
  CONFIRMED: "Đã xác nhận · Chờ dọn vào",
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  ENDED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

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
      <h1 className="text-[28px] font-bold">Kỳ thuê và hợp đồng</h1>
      {result.tenancies.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Chưa có kỳ thuê.
        </p>
      ) : (
        <ul className="space-y-3">
          {result.tenancies.map((tenancy) => (
            <li key={tenancy.id}>
              <Link
                href={`/owner/tenancies/${tenancy.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5"
              >
                <span>
                  <span className="block font-semibold text-ink">
                    {tenancy.unit.label} · {tenancy.unit.property.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {tenancy.rentalRequest.contactName}
                  </span>
                </span>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-deep">
                  {labels[tenancy.status] ?? tenancy.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager page={result.page} total={result.total} pageSize={result.pageSize} />
    </section>
  );
}

function Pager({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  if (total <= pageSize) return null;
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-5 text-sm">
      {page > 1 && <Link href={`?page=${page - 1}`}>Trang trước</Link>}
      <span>
        Trang {page} · {total} kỳ thuê
      </span>
      {page * pageSize < total && (
        <Link href={`?page=${page + 1}`}>Trang sau</Link>
      )}
    </nav>
  );
}
