import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenancy } from "@/server/tenancies/read";
import { requestDate } from "@/components/tenant/request-status";
import {
  resolveEffectivePolicies,
  validatePropertyPolicies,
  validateUnitPolicyOverrides,
} from "@/domain/policies";
import { ConfirmationCountdown } from "./confirmation-countdown";
import { Button, buttonClass } from "@/components/ui/button";
import {
  ContractDecision,
  ContractDownload,
  MoveInButton,
} from "./contract-controls";
const money = (value: string) => `${Number(value).toLocaleString("vi-VN")} ₫`;
const labels: Record<string, string> = {
  PENDING_CONFIRMATION: "Đang chờ xác nhận",
  AWAITING_REVISION: "Đang chờ phiên bản sửa đổi",
  CONFIRMED: "Đã xác nhận · Chờ dọn vào",
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  ENDED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};
export async function TenancyScreen({
  params,
  owner = false,
  review = false,
}: {
  params: Promise<{ id: string }>;
  owner?: boolean;
  review?: boolean;
}) {
  const t = await getTenancy((await params).id);
  if (!t || (owner && !t.isOwner) || (!owner && t.isOwner)) notFound();
  const serverNow = new Date().toISOString();
  const proposed = t.pendingContract;
  const expired = t.status === "EXPIRED";
  const display = review
    ? (proposed ?? (expired ? t.contracts[0] : null))
    : t.currentTerms;
  const snapshot = display?.policiesSnapshot;
  const snapshotObject =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot
      : null;
  const property = validatePropertyPolicies(snapshotObject?.property);
  const unit = validateUnitPolicyOverrides(snapshotObject?.unit);
  const policies =
    property.success && unit.success
      ? resolveEffectivePolicies(property.data, unit.data)
      : null;
  const policyLabels = {
    ALLOWED: "Cho phép",
    NOT_ALLOWED: "Không cho phép",
    ASK_OWNER: "Trao đổi với chủ nhà",
  };
  return (
    <section className="max-w-[1100px] space-y-5">
      <Link
        className="text-sm text-brand"
        href={
          owner ? `/owner/requests/${t.rentalRequestId}` : "/tenant/requests"
        }
      >
        {owner ? "Kỳ thuê và hợp đồng" : "Yêu cầu thuê"}
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">
            {t.unitLabel} · {owner ? t.contactName : t.propertyName}
          </h1>
          <p className="mt-1 text-sm text-muted">{t.address}</p>
        </div>
        <span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-deep">
          {labels[t.status] ?? t.status}
        </span>
      </header>
      {proposed && (
        <div className="rounded-2xl border border-line-brand bg-brand-soft p-5">
          <p className="font-semibold">
            Đang chờ xác nhận phiên bản {proposed.versionNumber}
          </p>
          <p className="mt-1 text-sm">
            Hạn phản hồi:{" "}
            {t.confirmationExpiresAt?.toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
          {t.confirmationExpiresAt && (
            <ConfirmationCountdown
              expiresAt={t.confirmationExpiresAt.toISOString()}
              serverNow={serverNow}
            />
          )}
        </div>
      )}
      {expired && (
        <div className="rounded-2xl border border-line bg-slate-100 p-5">
          <p className="font-bold">Hết hạn · Đã quá hạn chót phản hồi</p>
          <p className="mt-1 text-sm text-muted">
            Đề xuất đã hết hạn và việc giữ chỗ căn {t.unitLabel} đã được giải
            phóng. Không thể xác nhận phiên bản này.
          </p>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {review
                ? expired
                  ? "Điều khoản đề xuất (chỉ đọc)"
                  : "Điều khoản đề xuất"
                : "Điều khoản đã xác nhận"}
            </h2>
            {display ? (
              <dl className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                <dt className="text-muted">Thời hạn thuê</dt>
                <dd>
                  {requestDate(display.startDate)} –{" "}
                  {requestDate(display.endDate)}
                </dd>
                <dt className="text-muted">Giá thuê hằng tháng</dt>
                <dd className="text-xl font-bold text-brand-deep">
                  {money(display.monthlyRent)}/tháng
                </dd>
                <dt className="text-muted">Tiền cọc</dt>
                <dd>{money(display.depositAmount)}</dd>
                <dt className="text-muted">Phiên bản</dt>
                <dd>{display.versionNumber}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted">
                Chưa có điều khoản được hai bên xác nhận.
              </p>
            )}
            {policies && (
              <dl className="mt-4 grid grid-cols-[140px_1fr] gap-3 text-sm">
                <dt className="text-muted">Thú cưng</dt>
                <dd>{policyLabels[policies.defaults.pets]}</dd>
                <dt className="text-muted">Hút thuốc</dt>
                <dd>{policyLabels[policies.defaults.smoking]}</dd>
                <dt className="text-muted">Nội quy</dt>
                <dd>
                  {policies.rules.length
                    ? policies.rules.join(" · ")
                    : "Không có nội quy bổ sung"}
                </dd>
              </dl>
            )}
            <p className="mt-4 text-xs text-muted">
              Chỉ điều khoản được hai bên xác nhận mới là điều khoản hiện tại.
            </p>
          </section>
          {review && proposed && (
            <section className="rounded-2xl border border-line bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">Tài liệu hợp đồng</h2>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line p-4">
                <div>
                  <p className="font-semibold">
                    Hợp đồng · Phiên bản {proposed.versionNumber}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted">
                    SHA-256: {proposed.documentSha256}
                  </p>
                </div>
                <ContractDownload id={proposed.id} />
              </div>
              <p className="mt-4 text-xs text-muted">
                Liên kết riêng tư, tồn tại ngắn hạn. Quyền truy cập được kiểm
                tra mỗi lần mở.
              </p>
            </section>
          )}
          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Lịch sử hợp đồng</h2>
            <div className="space-y-3">
              {t.contracts.map((c) => (
                <article
                  key={c.id}
                  className="space-y-2 rounded-xl border border-line p-4"
                >
                  <p className="font-semibold">
                    Phiên bản {c.versionNumber} ·{" "}
                    {c.tenantConfirmedAt
                      ? "Đã xác nhận"
                      : c.tenantRejectedAt
                        ? "Đã từ chối"
                        : c.id === t.pendingContractId
                          ? "Đề xuất chờ xác nhận"
                          : "Đã thay thế hoặc hết hạn"}
                  </p>
                  <p className="text-sm">
                    {requestDate(c.startDate)} – {requestDate(c.endDate)} ·{" "}
                    {money(c.monthlyRent)}/tháng · cọc {money(c.depositAmount)}
                  </p>
                  {c.tenantRejectionReason && (
                    <p className="text-sm text-amber-800">
                      Lý do từ chối: {c.tenantRejectionReason}
                    </p>
                  )}
                  <p className="break-all text-xs text-muted">
                    SHA-256: {c.documentSha256}
                  </p>
                  <ContractDownload id={c.id} />
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
            <h2 className="text-lg font-bold">
              {owner ? "Hành động của chủ nhà" : "Quyết định của bạn"}
            </h2>
            {owner ? (
              <>
                {!t.currentTerms &&
                  [
                    "PENDING_CONFIRMATION",
                    "AWAITING_REVISION",
                    "EXPIRED",
                  ].includes(t.status) && (
                    <Link
                      className={buttonClass({ className: "w-full" })}
                      href={`/owner/tenancies/${t.id}/revise`}
                    >
                      Tạo phiên bản sửa đổi
                    </Link>
                  )}
                {t.status === "CONFIRMED" && <MoveInButton id={t.id} />}
                {t.status === "ACTIVE" && (
                  <p className="text-sm">
                    Đã ghi nhận dọn vào{" "}
                    {t.movedInAt && requestDate(t.movedInAt)}.
                  </p>
                )}
              </>
            ) : proposed ? (
              review ? (
                <ContractDecision
                  id={proposed.id}
                  sha256={proposed.documentSha256}
                  version={proposed.versionNumber}
                  expiresAt={t.confirmationExpiresAt!.toISOString()}
                  serverNow={serverNow}
                />
              ) : (
                <Link
                  className={buttonClass({ className: "w-full" })}
                  href={`/tenant/tenancies/${t.id}/review`}
                >
                  Xem đề xuất hợp đồng
                </Link>
              )
            ) : expired && review ? (
              <>
                <Button className="w-full" disabled variant="disabled">
                  Xác nhận phiên bản {t.contracts[0]?.versionNumber}
                </Button>
                <Button className="w-full" disabled variant="disabled">
                  Từ chối
                </Button>
                <p className="rounded-xl bg-slate-100 p-3 text-sm">
                  Nút bị vô hiệu hóa vì đã hết hạn chót. Bạn có thể liên hệ chủ
                  nhà để nhờ gửi lại đề xuất, hoặc gửi một yêu cầu thuê mới.
                </p>
                <Link
                  className={buttonClass({
                    variant: "secondary",
                    className: "w-full",
                  })}
                  href={`/listings/${t.listingId}`}
                >
                  Quay lại tin đăng
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">
                {t.status === "AWAITING_REVISION"
                  ? "Chủ nhà sẽ gửi phiên bản sửa đổi."
                  : "Không có đề xuất nào chờ xác nhận."}
              </p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
