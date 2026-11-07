import {
  AlertIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ContractIcon,
  InfoIcon,
} from "@/components/ui/icons";

const statuses = {
  PENDING_CONFIRMATION: {
    label: "Đang chờ xác nhận",
    className: "bg-amber-100 text-amber-950",
    Icon: ClockIcon,
  },
  AWAITING_REVISION: {
    label: "Chờ sửa hợp đồng",
    className: "bg-orange-100 text-orange-950",
    Icon: AlertIcon,
  },
  CONFIRMED: {
    label: "Chờ dọn vào",
    className: "bg-sky-100 text-sky-950",
    Icon: CalendarIcon,
  },
  ACTIVE: {
    label: "Đang hoạt động",
    className: "bg-emerald-100 text-emerald-900",
    Icon: CheckIcon,
  },
  EXPIRED: {
    label: "Hết hạn",
    className: "bg-rose-100 text-rose-900",
    Icon: AlertIcon,
  },
  ENDED: {
    label: "Đã kết thúc",
    className: "bg-slate-200 text-slate-700",
    Icon: ContractIcon,
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-slate-200 text-slate-600",
    Icon: InfoIcon,
  },
} as const;

export function TenancyStatus({ status }: { status: string }) {
  const item = statuses[status as keyof typeof statuses] ?? {
    label: status,
    className: "bg-slate-100 text-slate-700",
    Icon: InfoIcon,
  };
  const Icon = item.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${item.className}`}
    >
      <Icon className="size-3.5" />
      {item.label}
    </span>
  );
}
