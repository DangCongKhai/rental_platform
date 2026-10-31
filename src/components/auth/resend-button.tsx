"use client";

import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";

const COOLDOWN_SECONDS = 20;

/** "Resend email" button that locks for a cooldown after each send. */
export function ResendButton({ onResend }: { onResend: () => Promise<void> }) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  if (secondsLeft > 0) {
    const ss = String(secondsLeft).padStart(2, "0");
    return (
      <span
        aria-disabled="true"
        className={buttonClass({ variant: "disabled" })}
      >
        Gửi lại email sau 00:{ss}
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        await onResend();
        setSecondsLeft(COOLDOWN_SECONDS);
      }}
    >
      Gửi lại email
    </Button>
  );
}
