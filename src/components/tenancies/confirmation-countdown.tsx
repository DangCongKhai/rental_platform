"use client";
import { useEffect, useRef, useState } from "react";

/** The server still enforces the deadline; this clock prevents stale UI decisions. */
export function useConfirmationDeadline(expiresAt: string, serverNow: string) {
  const deadline = new Date(expiresAt).getTime();
  const serverEpoch = new Date(serverNow).getTime();
  const [now, setNow] = useState(serverEpoch);
  const clock = useRef<{ serverEpoch: number; monotonicStart: number } | null>(
    null,
  );
  useEffect(() => {
    // Browser wall clocks may be hours ahead/behind or changed while open.
    // Only elapsed monotonic time advances the authoritative server snapshot.
    const anchor = { serverEpoch, monotonicStart: performance.now() };
    clock.current = anchor;
    const tick = () =>
      setNow(anchor.serverEpoch + performance.now() - anchor.monotonicStart);
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    const remaining = deadline - serverEpoch;
    const final =
      remaining > 0 && remaining <= 2147483647
        ? setTimeout(tick, remaining)
        : null;
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      if (final !== null) clearTimeout(final);
    };
  }, [deadline, serverEpoch]);
  return {
    expired: now >= deadline,
    remainingMs: Math.max(0, deadline - now),
    isExpired: () => {
      const anchor = clock.current;
      const authoritativeNow = anchor
        ? anchor.serverEpoch + performance.now() - anchor.monotonicStart
        : serverEpoch;
      return authoritativeNow >= deadline;
    },
  };
}
export function ConfirmationCountdown({
  expiresAt,
  serverNow,
}: {
  expiresAt: string;
  serverNow: string;
}) {
  const { expired, remainingMs } = useConfirmationDeadline(
    expiresAt,
    serverNow,
  );
  const seconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return (
    <p role="timer" aria-live="off" className="mt-1 text-sm">
      {expired
        ? "Hết hạn · Không thể xác nhận phiên bản này."
        : `Còn ${hours} giờ ${minutes} phút ${seconds % 60} giây để phản hồi.`}
    </p>
  );
}
