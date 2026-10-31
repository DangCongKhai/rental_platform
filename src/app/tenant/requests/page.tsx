import { Suspense } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/loading-screen";
import { getMyRentalRequests } from "@/server/requests/my-requests";
import {
  RequestStatus,
  RequestTabs,
  requestDate,
} from "@/components/tenant/request-status";
type Query = Promise<{ tab?: string; page?: string }>;
export default function RequestsPage({
  searchParams,
}: {
  searchParams: Query;
}) {
  return (
    <section>
      <h1 className="mb-5 text-[28px] font-bold">Yêu cầu thuê của tôi</h1>
      <Suspense
        fallback={
          <LoadingScreen
            message="Đang tải yêu cầu..."
            className="min-h-80 w-full"
          />
        }
      >
        <RequestsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
async function RequestsContent({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const tab = query.tab === "closed" ? "closed" : "open";
  const parsed = Number(query.page);
  const page =
    Number.isInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
  const result = await getMyRentalRequests({ tab, page });
  return (
    <>
      <RequestTabs tab={tab} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              {[
                "Bài đăng",
                "Ngày mong muốn",
                "Căn ưu tiên",
                "Trạng thái",
                "Ngày gửi",
                "",
              ].map((label, i) => (
                <th key={i} className="px-4 py-4">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="min-w-48 px-4 py-5">
                  <Link
                    className="font-semibold"
                    href={`/tenant/requests/${r.id}`}
                  >
                    {r.listing.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.listing.property.ward}, {r.listing.property.city}
                  </p>
                </td>
                <td className="px-4 py-5">
                  {requestDate(r.desiredMoveInDate)} –{" "}
                  {requestDate(r.desiredEndDate)}
                </td>
                <td className="px-4 py-5">
                  {r.preferredUnit?.label ?? "Không ưu tiên"}
                </td>
                <td className="px-4 py-5">
                  <RequestStatus
                    status={r.status}
                    tenancyStatus={r.tenancy?.status}
                  />
                </td>
                <td className="px-4 py-5">{requestDate(r.createdAt)}</td>
                <td className="px-4 py-5">
                  <Link
                    className="rounded-xl border px-3 py-2 text-primary"
                    href={`/tenant/requests/${r.id}`}
                  >
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.requests.length && (
          <p className="p-8 text-center text-slate-600">
            Chưa có yêu cầu {tab === "open" ? "đang mở" : "đã đóng"}.
          </p>
        )}
      </div>
      <nav aria-label="Phân trang" className="mt-5 flex items-center gap-5">
        {page > 1 && (
          <Link href={`?tab=${tab}&page=${page - 1}`}>Trang trước</Link>
        )}
        <span>
          Trang {page} · {result.total} yêu cầu
        </span>
        {page * 20 < result.total && (
          <Link href={`?tab=${tab}&page=${page + 1}`}>Trang sau</Link>
        )}
      </nav>
    </>
  );
}
