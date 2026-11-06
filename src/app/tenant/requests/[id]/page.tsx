import { Suspense } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/loading-screen";
import { notFound } from "next/navigation";
import { getMyRentalRequest } from "@/server/requests/my-requests";
import { RequestStatus, requestDate } from "@/components/tenant/request-status";
import { ConfirmationCountdown } from "@/components/tenancies/confirmation-countdown";
import { WithdrawRequestButton } from "@/components/tenant/withdraw-request-button";
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
  const deadline =
    r.status === "ACCEPTED" &&
    r.tenancy?.status === "PENDING_CONFIRMATION" &&
    r.tenancy.confirmationExpiresAt
      ? r.tenancy.confirmationExpiresAt
      : null;
  const serverNow = new Date().toISOString();
  return (
    <section className="max-w-[1100px]">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"
        href="/tenant/requests"
      >
        <span aria-hidden="true">←</span>
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
                ? "Chủ nhà sẽ liên lạc với bạn. Hiện chưa có căn nào được giữ chỗ."
                : r.status === "WITHDRAWN"
                  ? "Bạn đã rút yêu cầu thuê này. Chủ nhà sẽ không tiếp tục xử lý yêu cầu."
                  : r.status === "REJECTED" && r.outcomeReason === "NO_AVAILABLE_UNIT"
                    ? "Yêu cầu đã tự động đóng vì không còn căn phù hợp trong khoảng thời gian bạn chọn."
                    : r.status === "REJECTED"
                      ? `Chủ nhà đã từ chối yêu cầu thuê này${r.outcomeReason ? `: ${r.outcomeReason}` : "."}`
                      : r.status === "EXPIRED"
                        ? "Yêu cầu đã hết hạn và không còn được tiếp tục xử lý."
                        : r.status === "CANCELLED"
                          ? "Yêu cầu thuê này đã bị hủy."
                          : "Yêu cầu đã được chấp nhận. Chủ nhà sẽ gửi đề xuất hợp đồng cho bạn."}
            </p>
            {deadline && (
              <>
                <p className="mt-2 text-sm">
                  Hạn phản hồi:{" "}
                  {deadline.toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <ConfirmationCountdown
                  expiresAt={deadline.toISOString()}
                  serverNow={serverNow}
                />
              </>
            )}
            {r.status === "ACCEPTED" && r.tenancy && (
              <Link
                className="mt-3 inline-flex rounded-xl bg-primary px-5 py-3 text-white"
                href={`/tenant/tenancies/${r.tenancy.id}/review`}
              >
                Xem đề xuất hợp đồng
              </Link>
            )}
            {r.status === "PENDING" && (
              <div className="mt-4">
                <WithdrawRequestButton id={r.id} />
              </div>
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
                [
                  "Căn ưu tiên",
                  r.preferredUnit?.label === "Entire property"
                    ? "Toàn bộ nhà"
                    : r.preferredUnit?.label ?? "Không ưu tiên",
                ],
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
