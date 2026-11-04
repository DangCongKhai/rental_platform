"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { rejectRequest } from "@/server/requests/reject-request";

export function RequestActions({
  id,
  pending,
  showView = true,
}: {
  id: string;
  pending: boolean;
  showView?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showView && (
        <Link
          href={`/owner/requests/${id}`}
          className={buttonClass({ variant: "secondary" })}
        >
          Xem
        </Link>
      )}
      {pending && (
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-[15px] border border-danger/40 px-4 text-[15px] font-semibold text-danger-ink hover:bg-[#fff8f7]"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          Từ chối
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-${id}`}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              setError("");
              startTransition(async () => {
                const result = await rejectRequest(id, reason);
                if (!result.ok) {
                  setError(result.fieldErrors?.reason ?? result.error);
                  return;
                }
                setOpen(false);
                setReason("");
                router.refresh();
              });
            }}
          >
            <h2 id={`cancel-${id}`} className="text-lg font-bold text-ink">
              Từ chối yêu cầu này?
            </h2>
            <p className="text-sm text-muted">
              Người thuê sẽ thấy yêu cầu đã bị từ chối. Thao tác này không hoàn
              tác.
            </p>
            <label className="grid gap-1 text-sm font-semibold text-ink">
              Lý do
              <textarea
                required
                value={reason}
                maxLength={500}
                rows={3}
                className="rounded-xl border border-line px-3 py-2 font-normal"
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger-ink">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass({ variant: "secondary" })}
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                Không
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-[15px] bg-danger-ink px-5 text-[15px] font-semibold text-white disabled:opacity-60"
                disabled={submitting || reason.trim().length === 0}
              >
                {submitting ? "Đang huỷ…" : "Huỷ yêu cầu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
