import { formatVietnamDateInput } from "@/lib/vietnam-date";

export function formatRentalRange(
  start: string | null,
  end: string | null,
) {
  const left = formatVietnamDateInput(start);
  const right = formatVietnamDateInput(end);
  if (!left && !right) return "—";
  return `${left || "—"} – ${right || "—"}`;
}

export function formatMonthlyRent(value: string | null) {
  if (!value) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} VNĐ/tháng`;
}
