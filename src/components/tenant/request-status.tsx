import Link from "next/link";

export function RequestTabs({ tab }: { tab: "open" | "closed" }) {
  return (
    <nav
      aria-label="Trạng thái yêu cầu"
      className="mb-5 flex gap-1 border-b border-slate-200"
    >
      {(
        [
          ["open", "Đang mở"],
          ["closed", "Đã đóng"],
        ] as const
      ).map(([value, label]) => (
        <Link
          key={value}
          href={`/tenant/requests?tab=${value}`}
          aria-current={tab === value ? "page" : undefined}
          className={`border-b-2 px-5 py-3 font-semibold ${tab === value ? "border-primary text-primary" : "border-transparent text-slate-600"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function RequestStatus({
  status,
  tenancyStatus,
}: {
  status: string;
  tenancyStatus?: string;
}) {
  const label =
    status === "ACCEPTED"
      ? tenancyStatus === "AWAITING_REVISION"
        ? "Đang chờ phiên bản sửa đổi"
        : tenancyStatus === "PENDING_CONFIRMATION"
          ? "Đang chờ bạn xác nhận hợp đồng"
          : "Đã chấp nhận"
      : status === "PENDING"
        ? "Đang chờ chủ nhà xử lý"
        : status === "REJECTED"
          ? "Chủ nhà đã từ chối"
          : status === "WITHDRAWN"
            ? "Bạn đã rút yêu cầu"
            : status === "EXPIRED"
              ? "Yêu cầu đã hết hạn"
              : status === "CANCELLED"
                ? "Yêu cầu đã bị hủy"
                : "Yêu cầu đã đóng";
  const tone =
    status === "ACCEPTED"
      ? "bg-blue-100 text-blue-800"
      : status === "PENDING"
        ? "bg-amber-100 text-amber-900"
        : status === "WITHDRAWN" || status === "CANCELLED"
          ? "bg-slate-100 text-slate-700"
          : status === "REJECTED" || status === "EXPIRED"
            ? "bg-red-100 text-red-800"
            : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
export function requestDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC" }).format(date);
}
