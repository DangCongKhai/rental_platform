"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawRentalRequest } from "@/server/requests/withdraw-request";
import { Button } from "@/components/ui/button";

export function WithdrawRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="space-y-2">
    {!open ? <Button variant="secondary" onClick={() => setOpen(true)}>Rút yêu cầu</Button> : <form className="space-y-3 rounded-xl border border-line p-4" onSubmit={(event) => {
      event.preventDefault(); setError("");
      startTransition(async () => {
        try {
          const result = await withdrawRentalRequest(id, reason);
          if (!result.ok) { setError(result.error); return; }
          setOpen(false); router.refresh();
        } catch { setError("Không rút được yêu cầu. Vui lòng thử lại."); }
      });
    }}>
      <p className="text-sm">Bạn có thể cho chủ nhà biết lý do rút yêu cầu (không bắt buộc).</p>
      <label className="grid gap-1 text-sm">Lý do<textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} className="min-h-20 rounded-xl border border-line p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><Button disabled={pending}>{pending ? "Đang rút…" : "Xác nhận rút"}</Button><Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>Đóng</Button></div>
    </form>}
  </div>;
}
