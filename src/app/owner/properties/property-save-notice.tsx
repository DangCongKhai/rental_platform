"use client";

import { useEffect, useState } from "react";

export function PropertySaveNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-5 top-5 z-50 flex items-center gap-4 rounded-xl border border-success/30 bg-white px-5 py-4 text-sm font-semibold text-success shadow-card"
    >
      <span>Bản nháp đã được lưu thành công.</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Đóng thông báo" className="text-lg leading-none text-subtle hover:text-ink">
        ×
      </button>
    </div>
  );
}
