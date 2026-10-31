import { Suspense } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/loading-screen";
import { notFound } from "next/navigation";
import { getMyRentalRequest } from "@/server/requests/my-requests";
import { RequestStatus, requestDate } from "@/components/tenant/request-status";
export default function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải yêu cầu..."
          className="min-h-80 w-full"
        />
      }
    >
      <RequestContent params={params} />
    </Suspense>
  );
}
async function RequestContent({ params }: { params: Promise<{ id: string }> }) {
  const r = await getMyRentalRequest((await params).id);
  if (!r) notFound();
  return (
    <section className="max-w-[1100px]">
      <Link className="text-sm text-primary" href="/tenant/requests">
        Yêu cầu thuê của tôi
      </Link>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">{r.listing.title}</h1>
          <p className="text-sm text-slate-500">
            {r.listing.property.ward}, {r.listing.property.city} · Đã gửi{" "}
            {requestDate(r.createdAt)}
          </p>
        </div>
        <RequestStatus status={r.status} tenancyStatus={r.tenancy?.status} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-semibold">
              {r.status === "PENDING"
                ? "Chủ nhà sẽ liên lạc cho bạn. Chưa có căn nào được giữ chỗ."
                : (r.outcomeReason ?? "Theo dõi trạng thái yêu cầu của bạn.")}
            </p>
            {r.status === "ACCEPTED" && r.tenancy && (
              <Link
                className="mt-3 inline-flex rounded-xl bg-primary px-5 py-3 text-white"
                href={`/tenant/tenancies/${r.tenancy.id}/review`}
              >
                Xem đề xuất hợp đồng
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Thông tin bạn đã gửi</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              {[
                ["Tên liên hệ", r.contactName],
                ["Số điện thoại", r.contactPhone],
                [
                  "Ngày thuê",
                  `${requestDate(r.desiredMoveInDate)} – ${requestDate(r.desiredEndDate)}`,
                ],
                ["Căn ưu tiên", r.preferredUnit?.label ?? "Không ưu tiên"],
                ["Lời nhắn", r.message],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-slate-500">
              Lưu theo lúc gửi. Các thay đổi hồ sơ sau này không làm đổi thông
              tin này.
            </p>
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold">Tiến trình</h2>
          <ol className="mt-4 space-y-5 text-sm">
            <li>Đã gửi · {requestDate(r.createdAt)}</li>
            <li>
              {r.status === "PENDING"
                ? "Chủ nhà liên lạc · Đang chờ"
                : "Kết quả yêu cầu"}
            </li>
            <li>
              <RequestStatus
                status={r.status}
                tenancyStatus={r.tenancy?.status}
              />
            </li>
          </ol>
        </aside>
      </div>
    </section>
  );
}
