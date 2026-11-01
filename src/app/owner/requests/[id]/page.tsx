import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { getOwnerRequest, type OwnerRequestStatus } from "@/server/owner-requests";

export const instant = false;

const statusLabels: Record<OwnerRequestStatus, string> = {
  PENDING: "Đang chờ xử lý",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  WITHDRAWN: "Đã rút lại",
};

function dateOnly(date: Date) {
  const [year, month, day] = date.toISOString().slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function rentalDuration(start: Date, end: Date) {
  const months = Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() - start.getUTCMonth(),
  );
  return `${months} tháng`;
}

function statusBanner(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Yêu cầu này đã được chấp nhận. Thông tin đặt thuê được giữ trong lịch sử yêu cầu.";
    case "REJECTED":
      return "Yêu cầu này đã bị từ chối.";
    case "WITHDRAWN":
      return "Người thuê đã rút yêu cầu này.";
    default:
      return "Hãy gọi cho người thuê để trao đổi. Việc xem nhà và thương lượng diễn ra bên ngoài rentOS. Yêu cầu vẫn giữ trạng thái Đang chờ cho đến khi bạn tạo đề xuất thuê.";
  }
}

function locationLine(property: { ward: string | null; city: string | null }) {
  return [property.ward, property.city].filter(Boolean).join(", ") || "Chưa có địa chỉ";
}

function statusClass(status: string) {
  if (status === "ACCEPTED") return "bg-[#dff3e5] text-[#287540]";
  if (status === "REJECTED" || status === "WITHDRAWN") return "bg-[#fde4e1] text-danger-ink";
  return "bg-[#fff0c9] text-[#865500]";
}

function RequestDetails({ request }: { request: NonNullable<Awaited<ReturnType<typeof getOwnerRequest>>> }) {
  const status = request.status as OwnerRequestStatus;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-subtle">
            <Link href="/owner/requests" className="text-brand-deep hover:underline">Yêu cầu thuê</Link>
            <span aria-hidden="true"> / </span>
            {request.listing.property.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">{request.contactName}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>
              {statusLabels[status] ?? request.status}
              {status === "PENDING" && ` · đã chờ ${request.daysWaiting} ngày`}
            </span>
          </div>
        </div>
        <Link href="/owner/requests" className={`${buttonClass({ variant: "secondary" })} lg:hidden`}>
          Đóng
        </Link>
      </header>

      <div className="rounded-2xl border border-line-brand bg-[#edf4fc] p-4 text-sm leading-5 text-brand-deep">
        <p>{statusBanner(request.status)}</p>
        {request.outcomeReason && <p className="mt-2">Lý do: {request.outcomeReason}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_284px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-subtle">Liên hệ</p>
                <h2 className="font-semibold text-ink">{request.contactName}</h2>
                <a href={`tel:${request.contactPhone}`} className="mt-1 inline-block text-lg font-semibold text-brand-deep hover:underline">
                  {request.contactPhone}
                </a>
              </div>
              <a href={`tel:${request.contactPhone}`} aria-label={`Gọi ${request.contactName}`} className={buttonClass()}>
                Gọi người thuê
              </a>
            </div>
            <p className="mt-2 text-xs text-subtle">Thông tin liên hệ được lưu như ảnh chụp tại thời điểm gửi yêu cầu.</p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Yêu cầu</h2>
            <dl className="mt-4 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-[135px_minmax(0,1fr)]">
              <dt className="text-subtle">Bất động sản</dt>
              <dd className="font-medium text-ink-2">{request.listing.title || request.listing.property.name}</dd>
              <dt className="text-subtle">Ngày thuê</dt>
              <dd className="font-medium text-ink-2">
                {dateOnly(request.desiredMoveInDate)} – {dateOnly(request.desiredEndDate)} · {rentalDuration(request.desiredMoveInDate, request.desiredEndDate)}
              </dd>
              <dt className="text-subtle">Căn ưu tiên</dt>
              <dd className="font-medium text-ink-2">{request.preferredUnit?.label ?? "Không ưu tiên căn/phòng"}</dd>
              <dt className="text-subtle">Địa chỉ</dt>
              <dd className="font-medium text-ink-2">{locationLine(request.listing.property)}</dd>
              <dt className="text-subtle">Gửi yêu cầu</dt>
              <dd className="font-medium text-ink-2">{dateOnly(request.createdAt)}</dd>
            </dl>
            <div className="mt-5 border-t border-line-soft pt-4">
              <h3 className="text-sm font-semibold text-ink">Lời nhắn</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-2">{request.message}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Hành động</h2>
            {status === "PENDING" ? (
              <div className="mt-3 space-y-2">
                <Button type="button" disabled variant="disabled" className="w-full">
                  Tạo đề xuất kỳ thuê
                </Button>
                <Button type="button" disabled variant="secondary" className="w-full border-danger/30 text-danger-ink opacity-60">
                  Từ chối
                </Button>
                <p className="text-xs leading-5 text-subtle">
                  Bạn có thể gọi người thuê để trao đổi. Tạo đề xuất và từ chối sẽ được bật khi các bước RENT-017 và RENT-019 được triển khai.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-5 text-subtle">
                Yêu cầu đã đóng hoặc được xử lý. Không còn thao tác phản hồi nào khả dụng.
              </p>
            )}
            <a href={`tel:${request.contactPhone}`} className={`${buttonClass({ variant: "secondary" })} mt-3 w-full`}>
              Gọi người thuê
            </a>
            {status === "PENDING" && (
              <p className="mt-3 text-xs leading-5 text-subtle">
                Gọi hoặc mở chi tiết không làm đổi trạng thái và không giữ chỗ căn/phòng.
              </p>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-ink">Thông tin gửi</h2>
            <p className="mt-2 text-sm text-ink-2">Ngày gửi: {dateOnly(request.createdAt)}</p>
            {request.closedAt && <p className="mt-1 text-sm text-ink-2">Ngày đóng: {dateOnly(request.closedAt)}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}

export default async function OwnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getOwnerRequest(id);
  if (!request) notFound();

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 top-[75px] z-40 overflow-y-auto bg-black/35 lg:hidden">
        <main className="min-h-full bg-canvas p-4 sm:p-7">
          <div className="mx-auto max-w-4xl space-y-4">
            <RequestDetails request={request} />
          </div>
        </main>
      </div>
      <main className="hidden max-w-5xl space-y-4 lg:block">
        <RequestDetails request={request} />
      </main>
    </>
  );
}
