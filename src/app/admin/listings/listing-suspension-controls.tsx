"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { restoreListing, suspendListing } from "./actions";

export function ListingSuspensionControls({ listingId, suspended }: { listingId: string; suspended: boolean }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = suspended ? await restoreListing(listingId, reason) : await suspendListing(listingId, reason);
      if (!result.ok) { setError(result.error); return; }
      setReason("");
      setSuccess(suspended ? "Đã khôi phục tin đăng." : "Đã đình chỉ tin đăng và thông báo chủ nhà.");
    });
  }
  return <div className="min-w-52 space-y-2">
    <label className="sr-only" htmlFor={`reason-${listingId}`}>{suspended ? "Ghi chú khôi phục" : "Lý do đình chỉ"}</label>
    <input id={`reason-${listingId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder={suspended ? "Ghi chú khôi phục" : "Lý do đình chỉ"} className="min-h-9 w-full rounded-lg border border-[#cad4df] bg-white px-2.5 text-xs outline-none focus:border-[#376da5]" />
    <button type="button" disabled={pending || !reason.trim()} onClick={submit} className={buttonClass({ variant: suspended ? "secondary" : "primary", className: "min-h-9 w-full rounded-lg px-3 text-xs" })}>
      {pending ? "Đang xử lý…" : suspended ? "Khôi phục" : "Đình chỉ"}
    </button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {success && <p role="status" className="text-xs text-green-700">{success}</p>}
  </div>;
}
