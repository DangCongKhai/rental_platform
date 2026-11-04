"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { approveListing, rejectListing } from "@/server/admin/actions";
import { Button, buttonClass } from "@/components/ui/button";

export function ReviewDecisionForm({
  listingId,
  expectedRevision,
  canDecide,
}: {
  listingId: string;
  expectedRevision: number;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function approve() {
    setError("");
    startTransition(async () => {
      const result = await approveListing(listingId, expectedRevision);
      if (result.ok) router.push("/admin/reviews?decision=approved");
      else setError(result.error);
    });
  }

  function reject() {
    setError("");
    startTransition(async () => {
      const result = await rejectListing(listingId, reason);
      if (result.ok) router.push("/admin/reviews?decision=rejected");
      else setError(result.fieldErrors?.reason ?? result.error);
    });
  }

  return (
    <section className="sticky top-4 rounded-xl border border-[#dce3eb] bg-white p-5 shadow-sm">
      <h2 className="font-bold">Quyết định</h2>
      {!canDecide ? (
        <p className="mt-3 rounded-lg bg-[#fff0cf] p-3 text-sm text-[#825500]">
          Tin này đã được quyết định hoặc nội dung đã thay đổi. Tải lại hàng đợi
          để tiếp tục.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <Button
              type="button"
              disabled={pending}
              onClick={approve}
              className="w-full rounded-lg"
            >
              {pending ? "Đang xử lý…" : "Phê duyệt"}
            </Button>
            <label
              htmlFor="rejection-reason"
              className="block text-sm font-semibold"
            >
              Lý do từ chối <span className="text-red-700">*</span>
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Nêu rõ nội dung cần chỉnh sửa hoặc lý do không được duyệt"
              className="w-full resize-y rounded-lg border border-[#cad4df] px-3 py-2 text-sm outline-none focus:border-[#376da5]"
              aria-describedby={error ? "decision-error" : undefined}
            />
            <Button
              type="button"
              disabled={pending}
              onClick={reject}
              variant="secondary"
              className="w-full rounded-lg border-red-200 text-red-700 hover:bg-red-50"
            >
              {pending ? "Đang xử lý…" : "Từ chối"}
            </Button>
          </div>
          {error && (
            <p
              id="decision-error"
              role="alert"
              className="mt-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-[#718096]">
            Phê duyệt chỉ xác nhận nội dung. Tin chưa được công khai; chủ nhà có
            thể đăng sau khi được duyệt.
          </p>
        </>
      )}
      <Link
        href="/admin/reviews"
        className={`${buttonClass({ variant: "secondary" })} mt-4 w-full rounded-lg`}
      >
        Quay lại hàng đợi
      </Link>
    </section>
  );
}
