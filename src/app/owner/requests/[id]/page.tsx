import { Suspense } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/loading-screen";
import { notFound } from "next/navigation";
import { getOwnerRentalRequest } from "@/server/tenancies/read";
import { requestDate } from "@/components/tenant/request-status";
import { buttonClass } from "@/components/ui/button";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải yêu cầu..."
          className="min-h-80 w-full"
        />
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const r = await getOwnerRentalRequest((await params).id);
  if (!r) notFound();
  return (
    <section className="max-w-[1100px] space-y-5">
      <p className="text-sm text-brand">Yêu cầu thuê</p>
      <h1 className="text-[28px] font-bold">{r.contactName}</h1>
      <p className="rounded-2xl border border-line-brand bg-brand-soft p-5 text-sm">
        Hãy gọi cho người thuê để trao đổi. Việc xem nhà và thương lượng diễn ra
        ngoài ứng dụng rentOS. Yêu cầu chuyển sang Đã chấp nhận khi bạn tạo đề
        xuất hợp đồng.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6">
            <div>
              <p className="text-sm text-muted">Liên hệ</p>
              <p className="text-lg font-semibold">{r.contactName}</p>
              <p className="text-lg font-semibold text-brand-deep">
                {r.contactPhone}
              </p>
              <p className="mt-2 text-xs text-muted">
                Bản chụp thông tin tại thời điểm gửi · số chưa xác minh
              </p>
            </div>
            <a className={buttonClass()} href={`tel:${r.contactPhone}`}>
              Gọi
            </a>
          </section>
          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Yêu cầu</h2>
            <dl className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <dt className="text-muted">Bài đăng</dt>
              <dd>{r.title}</dd>
              <dt className="text-muted">Ngày thuê</dt>
              <dd>
                {requestDate(r.desiredMoveInDate)} –{" "}
                {requestDate(r.desiredEndDate)}
              </dd>
              <dt className="text-muted">Căn ưu tiên</dt>
              <dd>{r.preferredUnitLabel ?? "Không ưu tiên"}</dd>
              <dt className="text-muted">Lời nhắn</dt>
              <dd className="whitespace-pre-wrap">{r.message}</dd>
            </dl>
          </section>
        </div>
        <aside className="space-y-4 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold">Hành động</h2>
          {r.status === "PENDING" ? (
            <Link
              className={buttonClass({ className: "w-full" })}
              href={`/owner/requests/${r.id}/proposal`}
            >
              Tạo đề xuất kỳ thuê
            </Link>
          ) : r.tenancyId ? (
            <Link
              className={buttonClass()}
              href={`/owner/tenancies/${r.tenancyId}`}
            >
              Xem kỳ thuê
            </Link>
          ) : (
            <p>Yêu cầu đã đóng.</p>
          )}
          <p className="text-xs text-muted">
            Đã gửi {requestDate(r.createdAt)}
          </p>
        </aside>
      </div>
    </section>
  );
}
