"use client";
import { useState } from "react";
import type { getMyReports } from "@/server/reports/report-listing";
const reasons: Record<string, string> = {
  FRAUD: "Gian lận hoặc lừa đảo",
  MISLEADING: "Sai lệch thông tin",
  HARMFUL: "Nội dung độc hại",
  OTHER: "Khác",
};
const statuses: Record<string, string> = {
  OPEN: "Đã tiếp nhận",
  REVIEWING: "Đang xem xét",
  RESOLVED: "Đã giải quyết",
  DISMISSED: "Đã bác bỏ",
};

export function ReportHistory({
  reports,
}: {
  reports: Awaited<ReturnType<typeof getMyReports>>;
}) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id);
  const selected = reports.find((report) => report.id === selectedId);
  if (!reports.length)
    return (
      <div className="rounded-[15px] border border-[#e1e7ed] bg-white p-6 text-[#5b6676]">
        Bạn chưa gửi báo cáo nào.
      </div>
    );
  function badge(status: string) {
    return (
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[13px] font-semibold ${status === "RESOLVED" ? "bg-[#ddf3e4] text-[#14692f]" : status === "DISMISSED" ? "bg-[#e8ebf0] text-[#454e5c]" : "bg-[#dce9f7] text-[#1f4e85]"}`}
      >
        {statuses[status] ?? status}
      </span>
    );
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="overflow-x-auto rounded-[15px] border border-[#e1e7ed] bg-white">
        <table className="w-full min-w-[620px] text-left text-[15px]">
          <thead className="bg-[#f7f9fb] text-[13px] text-[#5b6676]">
            <tr>
              {["Báo cáo", "Lý do", "Trạng thái", "Ngày gửi"].map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className={`border-t border-[#e7ebf1] ${selectedId === report.id ? "bg-[#f3f8fd]" : ""}`}
              >
                <td className="px-4 py-5">
                  <button
                    aria-pressed={selectedId === report.id}
                    onClick={() => setSelectedId(report.id)}
                    className="min-h-11 text-left font-semibold text-[#254e7a]"
                  >
                    #{report.id.slice(0, 8)}
                  </button>
                </td>
                <td className="px-4 py-5">
                  {report.reasonCodes
                    .map((code) => reasons[code] ?? code)
                    .join(", ")}
                </td>
                <td className="px-4 py-5">{badge(report.status)}</td>
                <td className="whitespace-nowrap px-4 py-5">
                  {new Date(report.createdAt).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <aside
          aria-label="Chi tiết báo cáo"
          className="grid gap-4 rounded-[15px] border border-[#e1e7ed] bg-white p-6"
        >
          <p className="text-[13px] text-[#5b6676]">
            Chi tiết báo cáo #{selected.id.slice(0, 8)}
          </p>
          <div>{badge(selected.status)}</div>
          <p className="text-sm">
            {selected.reasonCodes
              .map((code) => reasons[code] ?? code)
              .join(", ")}
          </p>
          <div className="rounded-xl bg-[#f1f4f8] px-3.5 py-3">
            <h2 className="mb-1 text-[13px] font-semibold text-[#5b6676]">
              Kết quả xử lý
            </h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {selected.resolutionSummary ||
                "Quản trị viên đang xem xét. Bạn sẽ nhận thông báo khi có kết quả."}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
