"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pagination } from "@/components/pagination";
import { listingStatusClass } from "@/app/owner/listing-status";
import { actionMessage } from "@/lib/action-error";
import type {
  OwnerListingFilter,
  OwnerPropertyPage,
  OwnerPropertySummary,
} from "@/lib/owner-types";
import { getOwnerProperties } from "@/server/owner/actions";

const filters = [
  ["all", "Tất cả"],
  ["published", "Đang đăng"],
  ["draft", "Bản nháp"],
] as const;

function statusLabel(listing: OwnerPropertySummary["listing"]) {
  if (!listing) return "Chưa có tin";
  if (listing.admin_suspended_at) return "Tạm ẩn bởi quản trị viên";
  if (listing.publication_status === "PUBLISHED") return "Đang hiển thị";
  if (listing.publication_status === "HIDDEN") return "Đã ẩn";
  if (listing.moderation_status === "PENDING") return "Đang chờ duyệt";
  if (listing.moderation_status === "APPROVED") return "Đã duyệt · Chưa đăng";
  if (listing.moderation_status === "REJECTED") return "Cần chỉnh sửa";
  return "Bản nháp";
}

export default function OwnerListingsPage() {
  const [result, setResult] = useState<OwnerPropertyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OwnerListingFilter>("all");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await getOwnerProperties({ page, filter });
        if (ignore) return;
        setResult(next);
      } catch (caught) {
        if (ignore) return;
        setError(
          actionMessage(
            caught,
            "Không thể tải danh sách bất động sản. Vui lòng thử lại.",
          ),
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [filter, page, retry]);

  const rows = result?.data ?? [];
  const firstWithoutListing = rows.find((item) => !item.listing)?.id;

  function chooseFilter(next: OwnerListingFilter) {
    setFilter(next);
    setPage(1);
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col px-1 py-4 sm:px-2 sm:py-6">
      <header className="mb-6 flex shrink-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            CỔNG CHỦ NHÀ
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tin đăng
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Soạn nội dung riêng cho tin đăng. Gửi duyệt và công khai là hai
            bước độc lập với việc quản lý bất động sản.
          </p>
        </div>
        {firstWithoutListing && (
          <Link
            href={`/owner/listings/new?propertyId=${firstWithoutListing}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#3368a0] px-5 text-sm font-semibold text-white"
          >
            Tạo bài đăng
          </Link>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5">
      {result && result.meta.total === 0 && filter === "all" && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Cần có bất động sản trước
          </h2>
          <Link
            href="/owner/properties"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#3368a0] px-5 text-sm font-semibold text-white"
          >
            Quản lý bất động sản
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="flex shrink-0 flex-wrap gap-2" role="tablist">
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => chooseFilter(value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${filter === value ? "border-[#3368a0] bg-[#3368a0] text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {filter === value && result && !loading
                  ? `${label} · ${result.meta.total}`
                  : label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="animate-pulse space-y-4" aria-busy="true">
              <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => setRetry((current) => current + 1)}
                className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Thử lại
              </button>
            </div>
          ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.length ? (
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Tiêu đề</th>
                      <th className="px-4 py-4">Bất động sản</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4">Căn đủ điều kiện hôm nay</th>
                      <th className="px-4 py-4">Cập nhật</th>
                      <th className="px-4 py-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((item) => {
                      const href = item.listing
                        ? `/owner/listings/${item.listing.id}`
                        : `/owner/listings/new?propertyId=${item.id}`;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {item.listing?.title || "Chưa có bản nháp"}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {item.name}
                          </td>
                          <td className="px-4 py-4">
                            <span className={listingStatusClass(item.listing)}>
                              {statusLabel(item.listing)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {item.eligible_unit_count} / {item.unit_count}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {new Date(item.updated_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={href}
                              className="font-semibold whitespace-nowrap text-[#3368a0] hover:underline"
                            >
                              {item.listing ? "Chỉnh sửa" : "Tạo bản nháp"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
              Không có tin đăng trong nhóm này.
            </div>
          )}
          </div>
          {result && result.meta.last_page > 1 && (
            <div className="flex shrink-0 justify-end">
              <Pagination
                current={result.meta.current_page}
                lastPage={result.meta.last_page}
                onSelect={setPage}
              />
            </div>
          )}
        </div>
          )}
        </div>
      )}
      </div>
    </section>
  );
}
