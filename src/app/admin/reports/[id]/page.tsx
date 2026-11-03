import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getReportReasonLabel } from "@/domain/reports/reasons";
import { ReportActions } from "../report-actions";
import { getAdminReport } from "@/server/admin/reports";

export const instant = false;
const statusLabel: Record<string, string> = { OPEN: "Mới gửi", REVIEWING: "Đang xem xét", RESOLVED: "Đã giải quyết", DISMISSED: "Đã bỏ qua" };

export default async function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const report = await getAdminReport(id);
  if (!report) notFound();
  const property = report.listing.property;
  return <div className="w-full space-y-5">
    <header><p className="text-sm text-[#627184]"><Link href="/admin/reports" className="text-[#1c4d78] hover:underline">Báo cáo vi phạm</Link> / Chi tiết</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Chi tiết báo cáo</h1><span className="rounded-full bg-[#edf3f8] px-3 py-1 text-xs font-semibold text-[#284c70]">{statusLabel[report.status] ?? report.status}</span></div><p className="mt-1 text-sm text-[#627184]">Gửi lúc {report.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-xl border border-[#dce3eb] bg-white p-5"><h2 className="text-lg font-bold">Nội dung báo cáo</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-[#718096]">Lý do</dt><dd className="mt-1 font-semibold">{(report.reasonCodes.length ? report.reasonCodes : [report.reasonCode]).map(getReportReasonLabel).join(", ")}</dd></div><div><dt className="text-xs text-[#718096]">Người báo cáo</dt><dd className="mt-1">{report.reporter.fullName} · {report.reporter.email}{report.reporter.phone ? ` · ${report.reporter.phone}` : ""}</dd></div></dl><div className="mt-4 border-t border-[#e7ebf0] pt-4"><h3 className="text-sm font-semibold">Mô tả chi tiết</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#344256]">{report.description}</p></div>
          {report.resolutionSummary && <p className="mt-4 rounded-lg bg-[#eef2f6] p-3 text-sm"><strong>Kết quả trước đó:</strong> {report.resolutionSummary}</p>}
        </section>
        <section className="rounded-xl border border-[#dce3eb] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Tin đăng được báo cáo</p><h2 className="mt-1 text-xl font-bold">{report.listing.title || "Chưa đặt tiêu đề"}</h2><p className="mt-1 text-sm text-[#627184]">{property.name} · Chủ nhà {property.owner.fullName}</p></div><span className="rounded-full bg-[#edf3f8] px-3 py-1 text-xs font-semibold">{report.listing.publicationStatus === "PUBLISHED" ? "Đang công khai" : report.listing.publicationStatus === "HIDDEN" ? "Đã ẩn" : "Bản nháp"}{report.listing.adminSuspendedAt ? " · Đã đình chỉ" : ""}</span></div>
          {report.listing.cover?.url && <Image src={report.listing.cover.url} alt={report.listing.cover.caption || "Ảnh bìa tin đăng"} width={720} height={420} unoptimized loading="eager" className="mt-4 max-h-80 w-full rounded-xl object-cover"/>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{report.listing.description || "Tin đăng chưa có mô tả."}</p><dl className="mt-4 grid gap-3 border-t border-[#e7ebf0] pt-4 sm:grid-cols-2"><div><dt className="text-xs text-[#718096]">Địa chỉ</dt><dd className="mt-1 text-sm">{[property.addressLine, property.ward, property.city].filter(Boolean).join(", ") || "Chưa có địa chỉ"}</dd></div><div><dt className="text-xs text-[#718096]">Loại bất động sản</dt><dd className="mt-1 text-sm">{property.propertyType} · {property.rentalArrangement === "WHOLE_SPACE" ? "Cho thuê toàn bộ" : "Cho thuê từng căn/phòng"}</dd></div><div><dt className="text-xs text-[#718096]">Liên hệ chủ nhà</dt><dd className="mt-1 text-sm">{property.owner.email}{property.owner.phone ? ` · ${property.owner.phone}` : ""}</dd></div><div><dt className="text-xs text-[#718096]">Trạng thái tin</dt><dd className="mt-1 text-sm">{report.listing.moderationStatus} · {report.listing.adminSuspendedAt ? `Đình chỉ: ${report.listing.suspensionReason}` : "Không bị đình chỉ"}</dd></div></dl>
        </section>
        <section className="rounded-xl border border-[#dce3eb] bg-white p-5"><h2 className="font-bold">Căn/phòng liên quan ({property.units.length})</h2>{property.units.length ? <div className="mt-3 divide-y divide-[#e7ebf0]">{property.units.map((unit) => <div key={unit.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-semibold">{unit.label} <span className="font-normal text-[#718096]">· {unit.unitKind} · {unit.operationalStatus}{unit.isMarketed ? " · Đang quảng bá" : ""}</span></span><span>{unit.advertisedMonthlyRent === null ? "Chưa có giá" : `${unit.advertisedMonthlyRent.toLocaleString("vi-VN")} ₫/tháng`} · tối đa {unit.maxOccupants ?? "—"} người</span></div>)}</div> : <p className="mt-2 text-sm text-[#718096]">Không có căn/phòng riêng.</p>}</section>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-4"><ReportActions reportId={report.id} status={report.status}/>{report.reviewedBy && <p className="rounded-lg bg-white p-4 text-xs text-[#627184]">Người xử lý gần nhất: {report.reviewedBy.fullName}</p>}</aside>
    </div>
  </div>;
}
