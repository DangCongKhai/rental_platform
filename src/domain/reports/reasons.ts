const REPORT_REASON_LABELS: Record<string, string> = {
  FRAUD: "Gian lận hoặc lừa đảo",
  MISLEADING: "Thông tin sai lệch",
  HARMFUL: "Nội dung độc hại",
  OTHER: "Khác",
};

export function getReportReasonLabel(reasonCode: string): string {
  return REPORT_REASON_LABELS[reasonCode] ?? reasonCode;
}
