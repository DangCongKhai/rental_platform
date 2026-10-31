"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  confirmContract,
  declineContract,
  recordMoveIn,
} from "@/server/tenancies/actions";
import { useConfirmationDeadline } from "./confirmation-countdown";
import { getContractDownloadUrl } from "@/server/tenancies/read";
export function ContractDownload({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await getContractDownloadUrl(id);
              if (!r.ok) setError(r.error);
              else window.open(r.data!.url, "_blank", "noopener,noreferrer");
            } catch {
              setError("Không mở được tài liệu. Thử lại.");
            }
          })
        }
      >
        {pending ? "Đang mở…" : "Mở tệp PDF"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
export function ContractDecision({
  id,
  sha256,
  version,
  expiresAt,
  serverNow,
}: {
  id: string;
  sha256: string;
  version: number;
  expiresAt: string;
  serverNow: string;
}) {
  const { expired, isExpired } = useConfirmationDeadline(expiresAt, serverNow);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  function act(decline: boolean) {
    if (isExpired()) {
      setError("Hợp đồng đã hết hạn.");
      router.refresh();
      return;
    }
    setError("");
    start(async () => {
      try {
        const r = decline
          ? await declineContract(id, reason)
          : await confirmContract(id, sha256);
        if (!r.ok) setError(r.error);
        else router.refresh();
      } catch {
        setError("Không lưu được phản hồi. Thử lại.");
      }
    });
  }
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        variant={expired ? "disabled" : "primary"}
        disabled={pending || rejecting || expired}
        onClick={() => act(false)}
      >
        Xác nhận phiên bản {version}
      </Button>
      <Button
        className="w-full"
        variant={expired ? "disabled" : "secondary"}
        disabled={pending || expired}
        onClick={() => setRejecting(!rejecting)}
      >
        Từ chối
      </Button>
      {rejecting && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(true);
          }}
        >
          <label className="grid gap-2 text-sm">
            Lý do từ chối
            <textarea
              required
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24 rounded-xl border border-line p-3"
            />
          </label>
          <Button disabled={pending || expired}>Gửi lý do</Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">
        Xác nhận nghĩa là ghi nhận phiên bản đã lưu trữ này. Đây không phải chữ
        ký điện tử.
      </p>
    </div>
  );
}
export function MoveInButton({ id }: { id: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await recordMoveIn(id);
              if (!r.ok) setError(r.error);
              else router.refresh();
            } catch {
              setError("Không lưu được. Thử lại.");
            }
          })
        }
      >
        Ghi nhận dọn vào
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
