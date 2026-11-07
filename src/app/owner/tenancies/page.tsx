import { Suspense } from "react";
import Link from "next/link";

import { LoadingScreen } from "@/components/loading-screen";
import { PageLinks } from "@/components/page-links";
import { TenancyTable } from "@/components/tenancies/tenancy-table";

import {
  getOwnerTenancies,
  type OwnerTenancyTab,
} from "@/server/tenancies/read";

const tabs: { id: OwnerTenancyTab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "waiting-tenant", label: "Chờ người thuê" },
  { id: "revision-needed", label: "Cần gửi sửa đổi" },
  { id: "renewal-pending", label: "Gia hạn cần trả lời" },
];

function pageNumber(value: string | undefined) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000
    ? parsed
    : 1;
}

function tabOf(value: string | undefined): OwnerTenancyTab {
  return tabs.some((tab) => tab.id === value)
    ? (value as OwnerTenancyTab)
    : "all";
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
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
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const tab = tabOf(query.tab);

  const result = await getOwnerTenancies(page, tab);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold">Kỳ thuê và hợp đồng</h1>

        <p className="mt-1 text-sm text-muted">
          Ngày dọn vào và dọn ra, giá thuê, tiền cọc và phiên bản hợp đồng của
          từng kỳ thuê.
        </p>
      </header>

      <nav aria-label="Lọc kỳ thuê" className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={
              item.id === "all"
                ? "/owner/tenancies"
                : `/owner/tenancies?tab=${item.id}`
            }
            aria-current={tab === item.id ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id
                ? "bg-brand text-white"
                : "bg-white text-ink hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {result.tenancies.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          {tab === "all"
            ? "Chưa có kỳ thuê."
            : "Không có kỳ thuê nào trong mục này."}
        </p>
      ) : (
        <TenancyTable tenancies={result.tenancies} party="owner" />
      )}

      <div className="flex justify-end">
        <PageLinks
          page={result.page}
          total={result.total}
          pageSize={result.pageSize}
          href={(nextPage) => {
            const params = new URLSearchParams();

            if (tab !== "all") params.set("tab", tab);
            if (nextPage > 1) params.set("page", String(nextPage));

            const query = params.toString();

            return query ? `/owner/tenancies?${query}` : "/owner/tenancies";
          }}
        />
      </div>
    </section>
  );
}
