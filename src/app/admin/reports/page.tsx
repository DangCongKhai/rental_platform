import Link from "next/link";
import { connection } from "next/server";
import { buttonClass } from "@/components/ui/button";
import { getReportReasonLabel } from "@/domain/reports/reasons";
import { getAdminReports } from "@/server/admin/reports";
import { TemporaryNotice } from "./temporary-notice";

export const instant = false;
const labels: Record<string, string> = { OPEN: "Mới gửi", REVIEWING: "Đang xem xét", RESOLVED: "Đã giải quyết", DISMISSED: "Đã bỏ qua" };
const statusColors: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  REVIEWING: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
};

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string; notice?: string }> }) {
  await connection();
  const params = await searchParams;
  const reports = await getAdminReports({ page: Number.parseInt(params.page ?? "1", 10) || 1, q: params.q, status: params.status });
  const href = (page: number) => `/admin/reports?page=${page}&status=${reports.status}${reports.search ? `&q=${encodeURIComponent(reports.search)}` : ""}`;
  return <div className="w-full space-y-5">
    {(params.notice === "resolved" || params.notice === "dismissed") && <TemporaryNotice type={params.notice} />}
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#bd7900]">An toàn cộng đồng</p><h1 className="mt-1 text-3xl font-bold">Báo cáo vi phạm</h1><p className="mt-1 text-sm text-[#627184]">Xem xét báo cáo, giải quyết hoặc bỏ qua với lý do rõ ràng.</p></div>
      <form action="/admin/reports" className="flex flex-wrap gap-2"><input name="q" defaultValue={reports.search} placeholder="Tìm tin đăng, người báo cáo" aria-label="Tìm báo cáo" className="min-h-10 w-64 rounded-lg border border-[#cad4df] bg-white px-3 text-sm outline-none focus:border-[#376da5]"/><select name="status" defaultValue={reports.status} aria-label="Lọc trạng thái báo cáo" className="min-h-10 rounded-lg border border-[#cad4df] bg-white px-3 pr-9 text-sm"><option value="ALL">Tất cả trạng thái</option><option value="OPEN">Mới gửi</option><option value="REVIEWING">Đang xem xét</option><option value="RESOLVED">Đã giải quyết</option><option value="DISMISSED">Đã bỏ qua</option></select><button className={buttonClass({ className: "min-h-10 rounded-lg px-4 text-sm" })}>Lọc</button></form>
    </header>
    <div className="overflow-x-auto rounded-xl border border-[#dce3eb] bg-white shadow-sm"><table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm"><colgroup><col className="w-[14%]"/><col className="w-[20%]"/><col className="w-[16%]"/><col className="w-[13%]"/><col className="w-[25%]"/><col className="w-[12%]"/></colgroup>
      <thead className="bg-[#f7f9fb] text-xs uppercase tracking-wide text-[#627184]"><tr>{["Ngày gửi", "Tin đăng / bất động sản", "Người báo cáo", "Lý do", "Mô tả", "Trạng thái"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#e7ebf0]">{reports.rows.map((report) => <tr key={report.id}>
        <td className="whitespace-nowrap px-4 py-4 text-xs">{report.createdAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
        <td className="break-words px-4 py-4"><Link href={`/admin/reports/${report.id}`} className="font-semibold text-[#1c4d78] hover:underline">{report.listing.title || "Chưa đặt tiêu đề"}</Link><p className="mt-1 text-xs text-[#718096]">{report.listing.property.name}</p></td>
        <td className="break-words px-4 py-4">{report.reporter.fullName}<p className="mt-1 text-xs text-[#718096]">{report.reporter.email}</p></td>
        <td className="px-4 py-4">{getReportReasonLabel(report.reasonCode)}</td><td className="break-words px-4 py-4 text-[#627184]">{report.description}</td>
        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[report.status] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"}`}>{labels[report.status] ?? report.status}</span><Link href={`/admin/reports/${report.id}`} className="mt-2 block text-xs font-semibold text-[#1c4d78] hover:underline">Mở báo cáo →</Link></td>
      </tr>)}</tbody>
    </table>
    {reports.rows.length === 0 && <div className="p-10 text-center"><p className="font-semibold">{reports.search ? "Không tìm thấy báo cáo phù hợp." : "Chưa có báo cáo nào."}</p><p className="mt-1 text-sm text-[#718096]">Báo cáo mới sẽ xuất hiện tại đây.</p></div>}</div>
    <footer className="flex items-center justify-between text-sm text-[#627184]"><span>{reports.total} báo cáo · Trang {reports.page}/{reports.pageCount}</span><div className="flex gap-2">{reports.page > 1 && <Link href={href(reports.page - 1)} className={buttonClass({ variant: "secondary", className: "min-h-9 rounded-lg px-3 text-xs" })}>Trang trước</Link>}{reports.page < reports.pageCount && <Link href={href(reports.page + 1)} className={buttonClass({ variant: "secondary", className: "min-h-9 rounded-lg px-3 text-xs" })}>Trang sau</Link>}</div></footer>
  </div>;
}
