"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { dismissReport, resolveReport, startReview } from "./actions";

export function ReportActions({ reportId, status }: { reportId: string; status: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [suspend, setSuspend] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const open = status === "OPEN" || status === "REVIEWING";

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
    listNotice?: "resolved" | "dismissed",
  ) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Không thể xử lý báo cáo."); return; }
      if (listNotice) {
        router.push(`/admin/reports?notice=${listNotice}`);
        return;
      }
      setNotice(message);
      router.refresh();
    });
  }

  return <section className="rounded-xl border border-[#dce3eb] bg-white p-5 shadow-sm">
    <h2 className="font-bold">Xử lý báo cáo</h2>
    {status === "OPEN" && <button type="button" disabled={pending} onClick={() => run(() => startReview(reportId), "Đã chuyển báo cáo sang trạng thái đang xem xét.")} className={buttonClass({ variant: "secondary", className: "mt-4 w-full rounded-lg" })}>{pending ? "Đang xử lý…" : "Bắt đầu xem xét"}</button>}
    {open ? <div className="mt-4 space-y-3">
      <label htmlFor="resolution-summary" className="block text-sm font-semibold">Kết quả / lý do xử lý <span className="text-red-700">*</span></label>
      <textarea id="resolution-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={1000} rows={4} placeholder="Ghi rõ kết quả kiểm tra và hướng xử lý" className="w-full resize-y rounded-lg border border-[#cad4df] px-3 py-2 text-sm outline-none focus:border-[#376da5]" />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={suspend} onChange={(event) => setSuspend(event.target.checked)} className="mt-1"/><span>Đình chỉ tin đăng trong cùng thao tác xử lý</span></label>
      <button type="button" disabled={pending || !summary.trim()} onClick={() => run(() => resolveReport(reportId, { summary, suspend }), "Đã giải quyết báo cáo.", "resolved")} className={buttonClass({ className: "w-full rounded-lg" })}>{pending ? "Đang xử lý…" : "Giải quyết báo cáo"}</button>
      <button type="button" disabled={pending || !summary.trim()} onClick={() => run(() => dismissReport(reportId, summary), "Đã bỏ qua báo cáo.", "dismissed")} className={buttonClass({ variant: "secondary", className: "w-full rounded-lg border-red-200 text-red-700 hover:bg-red-50" })}>{pending ? "Đang xử lý…" : "Bỏ qua báo cáo"}</button>
      <p className="text-xs leading-5 text-[#718096]">Kết quả được gửi cho người báo cáo. Khi chọn đình chỉ, chủ nhà cũng nhận thông báo kèm lý do.</p>
    </div> : <p className="mt-3 rounded-lg bg-[#eef2f6] p-3 text-sm text-[#627184]">Báo cáo đã đóng. Không thể xử lý lại.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
    <Link href="/admin/reports" className={`${buttonClass({ variant: "secondary" })} mt-4 w-full rounded-lg`}>Quay lại danh sách</Link>
  </section>;
}
