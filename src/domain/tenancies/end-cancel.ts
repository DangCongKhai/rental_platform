export type EndCancelValidation =
  { valid: true } | { valid: false; error: string };

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // reject impossible dates such as February 30
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;

  return date;
}

function utcDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function canCancelConfirmedTenancy(
  status: string,
  confirmedStartDate: Date | null,
  now: Date,
): boolean {
  return (
    status === "CONFIRMED" &&
    confirmedStartDate !== null &&
    utcDate(now) < utcDate(confirmedStartDate)
  );
}

export function validateEarlyEnd(input: {
  status: string;
  startDate: Date | null;
  actualEndDate: string;
  reason: string;
  now: Date;
}): EndCancelValidation {
  if (input.status !== "ACTIVE") {
    return {
      valid: false,
      error: "Chỉ có thể kết thúc kỳ thuê đang hoạt động.",
    };
  }

  if (!input.startDate || Number.isNaN(input.startDate.getTime())) {
    return {
      valid: false,
      error: "Không tìm thấy ngày bắt đầu kỳ thuê hợp lệ.",
    };
  }

  if (!input.reason.trim()) {
    return {
      valid: false,
      error: "Vui lòng nhập lý do kết thúc kỳ thuê.",
    };
  }

  const endDate = parseDateOnly(input.actualEndDate);
  if (!endDate) {
    return {
      valid: false,
      error: "Ngày kết thúc không hợp lệ.",
    };
  }

  if (endDate < utcDate(input.startDate)) {
    return {
      valid: false,
      error: "Ngày kết thúc không thể trước ngày bắt đầu kỳ thuê.",
    };
  }

  if (endDate > utcDate(input.now)) {
    return {
      valid: false,
      error: "Ngày kết thúc không thể ở tương lai.",
    };
  }

  return {
    valid: true,
  };
}
