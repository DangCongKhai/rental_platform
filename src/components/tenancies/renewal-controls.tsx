"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import {
  requestRenewal,
  rejectRenewal,
  withdrawRenewal,
} from "@/server/tenancies/renewal-actions";

type Renewal = {
  id: string;
  requestedEndDate: Date | string;
  proposedMonthlyRent: string;
  message: string | null;
  status: string;
  reviewReason: string | null;
  createdAt: Date | string;
};
const money = (value: string) => `${Number(value).toLocaleString("vi-VN")} ₫`;
const dateLabel = (value: Date | string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "UTC" });
const nextDate = (value: string | null) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function TenantRenewalControls({
  tenancyId,
  status,
  confirmedEndDate,
  currentRent,
  renewals,
}: {
  tenancyId: string;
  status: string;
  confirmedEndDate: string | null;
  currentRent: string | null;
  renewals: Renewal[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const pending = renewals.find((item) => item.status === "PENDING");
  const eligible = ["CONFIRMED", "ACTIVE"].includes(status) && !pending;
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
      <div>
        <h2 className="text-lg font-bold">Gia hạn kỳ thuê</h2>
        <p className="mt-1 text-sm text-muted">
          Ngày kết thúc hiện tại: {confirmedEndDate ?? "Chưa xác nhận"}
        </p>
      </div>
      {renewals.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-line p-4 text-sm"
        >
          <p className="font-semibold">
            {item.status === "PENDING"
              ? "Đang chờ chủ nhà"
              : item.status === "ACCEPTED"
                ? "Đã gia hạn"
                : item.status === "REJECTED"
                  ? "Đã từ chối"
                  : "Đã rút"}
          </p>
          <p className="mt-1">
            Đề nghị đến {dateLabel(item.requestedEndDate)} ·{" "}
            {money(item.proposedMonthlyRent)}/tháng
          </p>
          {item.message && (
            <p className="mt-2 whitespace-pre-wrap">{item.message}</p>
          )}
          {item.reviewReason && (
            <p className="mt-2 text-muted">Lý do: {item.reviewReason}</p>
          )}
          {item.status === "PENDING" && (
            <Button
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() => {
                setError("");
                start(async () => {
                  const result = await withdrawRenewal(item.id);
                  if (!result.ok) setError(result.error);
                  else router.refresh();
                });
              }}
            >
              {busy ? "Đang rút…" : "Rút yêu cầu"}
            </Button>
          )}
        </article>
      ))}
      {eligible && !open && (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Yêu cầu gia hạn
        </Button>
      )}
      {open && (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setError("");
            start(async () => {
              const result = await requestRenewal(tenancyId, {
                requestedEndDate: String(data.get("requestedEndDate") ?? ""),
                proposedMonthlyRent: data.get("proposedMonthlyRent"),
                message: String(data.get("message") ?? ""),
              });
              if (!result.ok) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <label className="grid gap-1 text-sm">
            Ngày kết thúc đề nghị
            <input
              required
              name="requestedEndDate"
              type="date"
              min={nextDate(confirmedEndDate)}
              className="rounded-xl border border-line p-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Giá thuê đề nghị / tháng
            <input
              required
              min="1"
              name="proposedMonthlyRent"
              type="number"
              defaultValue={currentRent ?? ""}
              className="rounded-xl border border-line p-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lời nhắn
            <textarea
              name="message"
              maxLength={2000}
              className="min-h-20 rounded-xl border border-line p-3"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button disabled={busy}>
              {busy ? "Đang gửi…" : "Gửi yêu cầu"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export function OwnerRenewalRequests({
  tenancyId,
  renewals,
}: {
  tenancyId: string;
  renewals: Renewal[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const pending = renewals.filter((item) => item.status === "PENDING");
  if (!pending.length) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold">Yêu cầu gia hạn</h2>
      {pending.map((item) => (
        <article
          key={item.id}
          className="space-y-3 rounded-xl border border-line p-4"
        >
          <p>
            Đến {dateLabel(item.requestedEndDate)} ·{" "}
            {money(item.proposedMonthlyRent)}/tháng
          </p>
          {item.message && (
            <p className="whitespace-pre-wrap text-sm">{item.message}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              className={buttonClass()}
              href={`/owner/tenancies/${tenancyId}/renewal?requestId=${item.id}`}
            >
              Đề xuất gia hạn
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setTarget(item.id);
                setError("");
              }}
            >
              Từ chối
            </Button>
          </div>
          {target === item.id && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                start(async () => {
                  const result = await rejectRenewal(item.id, reason);
                  if (!result.ok) setError(result.error);
                  else {
                    setTarget(null);
                    setReason("");
                    router.refresh();
                  }
                });
              }}
            >
              <label className="grid gap-1 text-sm">
                Lý do từ chối
                <textarea
                  required
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-20 rounded-xl border border-line p-3"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi lý do từ chối"}
              </Button>
            </form>
          )}
        </article>
      ))}
    </section>
  );
}
