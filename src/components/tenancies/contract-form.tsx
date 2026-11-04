"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { proposeTenancy, reviseContract } from "@/server/tenancies/actions";
import type { AgreedRulesView } from "./agreed-rules";

type Unit = {
  id: string;
  label: string;
  operationalStatus: string;
  monthlyRent: string;
  depositAmount: string;
};

export function ContractForm({
  id,
  revision = false,
  units,
  preferredUnitId,
  startDate,
  endDate,
  monthlyRent,
  depositAmount,
  rulesByUnitId,
}: {
  id: string;
  revision?: boolean;
  units: Unit[];
  preferredUnitId?: string | null;
  startDate: string;
  endDate: string;
  monthlyRent?: string;
  depositAmount?: string;
  rulesByUnitId: Record<string, AgreedRulesView>;
}) {
  const steps = revision
    ? ["Điều khoản", "Quy định đã thỏa thuận", "Tài liệu hợp đồng"]
    : ["Chọn căn", "Điều khoản", "Quy định đã thỏa thuận", "Tài liệu hợp đồng"];
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(
    preferredUnitId ??
      units.find((u) => u.operationalStatus === "READY")?.id ??
      "",
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unit = units.find((u) => u.id === selected);
  const rules = rulesByUnitId[selected];
  const last = steps.length - 1;
  const showUnit = !revision && step === 0;
  const showTerms = revision ? step === 0 : step === 1;
  const showRules = revision ? step === 1 : step === 2;
  const showPdf = step === last;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!showPdf) return;
        const form = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const input = {
            unitId: selected,
            startDate: String(form.get("startDate") ?? ""),
            endDate: String(form.get("endDate") ?? ""),
            monthlyRent: form.get("monthlyRent"),
            depositAmount: form.get("depositAmount"),
          };
          const file = form.get("document");
          if (!(file instanceof File) || file.size === 0) {
            setError("Chọn tài liệu PDF.");
            return;
          }
          try {
            const result = revision
              ? await reviseContract(id, input, file)
              : await proposeTenancy(id, input, file);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/owner/tenancies/${result.data!.tenancyId}`);
            router.refresh();
          } catch {
            setError("Không gửi được hợp đồng. Thử lại.");
          }
        });
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <section className="space-y-6 rounded-2xl border border-line bg-white p-6">
        <ol aria-label="Các bước đề xuất" className="flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`rounded-full px-3 py-1 text-sm ${index === step ? "bg-brand text-white" : "bg-surface text-muted"}`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <fieldset hidden={!showUnit} className="space-y-3">
          <legend className="mb-3 text-lg font-bold">Chọn căn thuê</legend>
          <p className="text-sm text-muted">
            Tình trạng giữ chỗ được kiểm tra lại khi gửi đề xuất.
          </p>
          {units.map((u) => (
            <label
              key={u.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${selected === u.id ? "border-brand bg-brand-soft" : "border-line"}`}
            >
              <span>
                <input
                  type="radio"
                  name="unit"
                  checked={selected === u.id}
                  onChange={() => setSelected(u.id)}
                  disabled={u.operationalStatus !== "READY"}
                  required={showUnit}
                />{" "}
                {u.label} ·{" "}
                {u.operationalStatus === "READY"
                  ? "Sẵn sàng"
                  : "Không sẵn sàng"}
              </span>
              <span>
                {Number(u.monthlyRent).toLocaleString("vi-VN")} ₫/tháng
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset hidden={!showTerms} className="space-y-4">
          <legend className="text-lg font-bold">Điều khoản</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              name="startDate"
              label="Ngày bắt đầu"
              defaultValue={startDate}
              required={showTerms}
            />
            <DateField
              name="endDate"
              label="Ngày kết thúc"
              defaultValue={endDate}
              required={showTerms}
            />
            <label className="grid gap-1 text-sm font-semibold">
              Giá thuê hằng tháng (₫)
              <input
                key={`rent-${selected}`}
                className="min-h-12 rounded-xl border border-line px-3 font-normal"
                name="monthlyRent"
                type="number"
                min="1"
                max="99999999999999"
                step="1"
                defaultValue={monthlyRent ?? unit?.monthlyRent}
                required={showTerms}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Tiền cọc (₫)
              <input
                key={`deposit-${selected}`}
                className="min-h-12 rounded-xl border border-line px-3 font-normal"
                name="depositAmount"
                type="number"
                min="0"
                max="99999999999999"
                step="1"
                defaultValue={depositAmount ?? unit?.depositAmount}
                required={showTerms}
              />
            </label>
          </div>
          <p className="text-sm text-muted">Thời hạn thuê tối thiểu 3 tháng.</p>
        </fieldset>
        <fieldset hidden={!showRules} className="space-y-3">
          <legend className="text-lg font-bold">Quy định đã thỏa thuận</legend>
          <p className="text-sm text-muted">
            Đây là quy định sẽ được lưu cùng phiên bản hợp đồng. Bạn không sửa
            chúng tại bước này.
          </p>
          <dl className="grid grid-cols-[140px_1fr] gap-3 text-sm">
            <dt className="text-muted">Thú cưng</dt>
            <dd>{rules?.pets ?? "Chưa có"}</dd>
            <dt className="text-muted">Hút thuốc</dt>
            <dd>{rules?.smoking ?? "Chưa có"}</dd>
            <dt className="text-muted">Nội quy</dt>
            <dd>
              {rules?.rules.length
                ? rules.rules.join(" · ")
                : "Không có nội quy bổ sung"}
            </dd>
          </dl>
        </fieldset>
        <fieldset hidden={!showPdf} className="space-y-4">
          <legend className="text-lg font-bold">Tài liệu hợp đồng</legend>
          <label className="grid gap-2 text-sm font-semibold">
            Tài liệu {revision ? "mới " : ""}(PDF, tối đa 10 MB)
            <input
              name="document"
              type="file"
              accept="application/pdf,.pdf"
              required={showPdf}
              className="rounded-xl border border-line p-4"
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required={showPdf} className="mt-1" />
            Tôi xác nhận đây là phiên bản chính xác mà tôi gửi đi.
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((current) => current - 1)}
            >
              Quay lại
            </Button>
          )}
          {showPdf ? (
            <Button disabled={pending}>
              {pending
                ? "Đang gửi…"
                : revision
                  ? "Gửi phiên bản mới"
                  : "Gửi đề xuất kỳ thuê"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((current) => current + 1)}
            >
              Tiếp tục
            </Button>
          )}
        </div>
      </section>
      <aside className="h-fit space-y-4 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Sau khi gửi</h2>
        <p className="text-sm text-muted">
          Người thuê cần xác nhận phiên bản này trước hạn phản hồi. Căn được giữ
          trong thời gian chờ.
        </p>
        {revision && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm">
            Các xác nhận từ phiên bản trước không được bảo lưu sang phiên bản
            này.
          </p>
        )}
      </aside>
    </form>
  );
}
