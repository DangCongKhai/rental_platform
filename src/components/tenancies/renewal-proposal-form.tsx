"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { proposeRenewal } from "@/server/tenancies/renewal-actions";
import { Button } from "@/components/ui/button";

export function RenewalProposalForm({ tenancyId, requestId, requestedEndDate, requestedRent }: { tenancyId: string; requestId: string; requestedEndDate: string; requestedRent: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <form className="grid gap-4 rounded-2xl border border-line bg-white p-6" onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get("document"); setError("");
    if (!(file instanceof File) || file.size === 0) { setError("Chọn tệp PDF hợp đồng."); return; }
    start(async () => { try { const result = await proposeRenewal(tenancyId, { renewalRequestId: requestId, monthlyRent: data.get("monthlyRent") }, file); if (!result.ok) setError(result.error); else { router.push(`/owner/tenancies/${tenancyId}`); router.refresh(); } } catch { setError("Không gửi được đề xuất gia hạn. Thử lại."); } });
  }}>
    <h2 className="text-xl font-bold">Điều khoản đề xuất</h2>
    <p className="text-sm text-muted">Bắt đầu từ ngày tiếp theo sau kỳ thuê hiện tại. Giá đề xuất của bạn có thể khác sau khi hai bên trao đổi.</p>
    <label className="grid gap-1 text-sm">Ngày kết thúc<input readOnly value={requestedEndDate} className="rounded-xl border border-line bg-slate-50 p-3" /></label>
    <label className="grid gap-1 text-sm">Giá thuê hằng tháng (₫)<input required name="monthlyRent" type="number" min="1" defaultValue={requestedRent} className="rounded-xl border border-line p-3" /></label>
    <label className="grid gap-1 text-sm">Tệp hợp đồng PDF<input required name="document" type="file" accept="application/pdf,.pdf" className="rounded-xl border border-line p-3" /></label>
    <p className="text-xs text-muted">PDF tối đa 10 MB. Điều khoản hiện tại chưa thay đổi cho đến khi người thuê xác nhận.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button disabled={pending}>{pending ? "Đang gửi…" : "Gửi đề xuất gia hạn"}</Button>
  </form>;
}
