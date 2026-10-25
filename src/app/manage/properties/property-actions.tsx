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
        <div className="space-y-2">
            <button type="button" disabled={pending} onClick={archive} className="min-h-11 rounded-xl border border-line-strong px-4 text-sm font-semibold text-danger-ink hover:bg-red-50 disabled:opacity-60">
                {pending ? "Đang lưu trữ…" : "Lưu trữ"}
            </button>

            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
