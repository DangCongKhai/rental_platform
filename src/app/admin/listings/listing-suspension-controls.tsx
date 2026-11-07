"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { restoreListing, suspendListing } from "./actions";

const linkClass =
  "shrink-0 text-sm font-semibold text-[#1c4d78] hover:underline";

export function ListingSuspensionControls({
  listingId,
  suspended,
}: {
  listingId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const title = suspended ? "Khôi phục tin đăng" : "Đình chỉ tin đăng";
  const fieldLabel = suspended ? "Ghi chú khôi phục" : "Lý do đình chỉ";

  function close() {
    if (pending) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        className={linkClass}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {suspended ? "Khôi phục" : "Đình chỉ"}
      </button>
      {open && (
        <div
          className={[
            "fixed inset-0 z-50 flex items-center",
            "justify-center bg-black/40 p-4",
          ].join(" ")}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`suspend-${listingId}`}
            className={[
              "w-full max-w-md space-y-4 rounded-2xl",
              "bg-white p-6 shadow-xl",
            ].join(" ")}
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = suspended
                  ? await restoreListing(listingId, reason)
                  : await suspendListing(listingId, reason);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                setReason("");
                router.refresh();
              });
            }}
          >
            <h2
              id={`suspend-${listingId}`}
              className="text-lg font-bold text-[#172331]"
            >
              {title}
            </h2>
            <p className="text-sm text-[#627184]">
              {suspended
                ? "Tin sẽ công khai lại. Chủ nhà nhận ghi chú này."
                : "Tin sẽ bị ẩn. Chủ nhà nhận lý do này."}
            </p>
            <label className="grid gap-1 text-sm font-semibold">
              {fieldLabel}
              <textarea
                required
                value={reason}
                maxLength={1000}
                rows={4}
                autoFocus
                className={[
                  "rounded-xl border border-[#cad4df] px-3 py-2",
                  "font-normal outline-none focus:border-[#376da5]",
                ].join(" ")}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass({
                  variant: "secondary",
                  className: "min-h-10 rounded-lg px-4 text-sm",
                })}
                disabled={pending}
                onClick={close}
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={pending || !reason.trim()}
                className={buttonClass({
                  className: "min-h-10 rounded-lg px-4 text-sm",
                })}
              >
                {pending ? "Đang xử lý…" : title}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
