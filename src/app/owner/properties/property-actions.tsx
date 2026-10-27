"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProperty } from "./actions";

export function PropertyActions({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function archive() {
    const confirmed = window.confirm("Lưu trữ bất động sản này? Lịch sử thuê và yêu cầu liên quan vẫn được giữ.");
    if (!confirmed) return;

    setError("");
    startTransition(async () => {
      const result = await archiveProperty(propertyId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={archive}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[15px] border border-ink px-2.5 text-[15px] font-semibold text-danger-ink hover:bg-[#fdf2f1] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Đang lưu trữ…" : "Lưu trữ"}
      </button>
      {error && (
        <p role="alert" className="max-w-40 text-right text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
