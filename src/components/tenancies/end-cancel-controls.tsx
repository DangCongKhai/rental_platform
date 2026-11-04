"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelTenancy, endTenancy } from "@/server/tenancies/actions";

export function EndCancelControls({
  id,
  status,
  startDate,
  canCancel,
}: {
  id: string;
  status: string;
  startDate: string | null;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"cancel" | "end" | null>(null);
  const [reason, setReason] = useState("");
  const [actualEndedAt, setActualEndedAt] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result =
        open === "cancel"
          ? await cancelTenancy(id, reason)
          : await endTenancy(id, {
              actual_ended_at: actualEndedAt,
              reason,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(null);
      setReason("");
      setActualEndedAt("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {status === "CONFIRMED" && canCancel && (
        <Button
          type="button"
          variant="secondary"
          className="w-full text-red-700"
          onClick={() => {
            setError("");
            setOpen("cancel");
          }}
        >
          Hủy kỳ thuê
        </Button>
      )}

      {status === "ACTIVE" && (
        <Button
          type="button"
          variant="secondary"
          className="w-full text-red-700"
          onClick={() => {
            setError("");
            setOpen("end");
          }}
        >
          Kết thúc kỳ thuê sớm
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`tenancy-${open}-${id}`}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={submit}
          >
            <h2 id={`tenancy-${open}-${id}`} className="text-lg font-bold">
              {open === "cancel" ? "Hủy kỳ thuê?" : "Kết thúc kỳ thuê sớm?"}
            </h2>

            <p className="text-sm text-muted">
              {open === "cancel"
                ? "Kỳ thuê sẽ bị hủy trước ngày bắt đầu và người thuê sẽ được thông báo."
                : "Ngày kết thúc và lý do sẽ được lưu vào lịch sử kỳ thuê. Người thuê sẽ được thông báo."}
            </p>

            {open === "end" && (
              <label className="grid gap-2 text-sm">
                Ngày kết thúc thực tế
                <input
                  type="date"
                  required
                  min={startDate ?? undefined}
                  value={actualEndedAt}
                  onChange={(event) => setActualEndedAt(event.target.value)}
                  className="min-h-11 rounded-xl border border-line px-3"
                />
              </label>
            )}

            <label className="grid gap-2 text-sm">
              Lý do
              <textarea
                required
                maxLength={1000}
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="rounded-xl border border-line p-3"
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setOpen(null)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                disabled={
                  pending ||
                  !reason.trim() ||
                  (open === "end" && !actualEndedAt)
                }
              >
                {pending
                  ? "Đang lưu…"
                  : open === "cancel"
                    ? "Xác nhận hủy"
                    : "Xác nhận kết thúc"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
