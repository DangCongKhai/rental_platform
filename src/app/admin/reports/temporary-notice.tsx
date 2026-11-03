"use client";

import { useEffect, useState } from "react";

export function TemporaryNotice({ type }: { type: "resolved" | "dismissed" }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  const resolved = type === "resolved";
  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${resolved ? "border-green-200 bg-green-50 text-green-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
    >
      {resolved ? "Báo cáo đã được giải quyết thành công." : "Báo cáo đã được bỏ qua thành công."}
    </p>
  );
}
