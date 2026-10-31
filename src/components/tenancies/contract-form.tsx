"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { proposeTenancy, reviseContract } from "@/server/tenancies/actions";

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
}: {
  id: string;
  revision?: boolean;
  units: Unit[];
  preferredUnitId?: string | null;
  startDate: string;
  endDate: string;
  monthlyRent?: string;
  depositAmount?: string;
}) {
  const [selected, setSelected] = useState(
    preferredUnitId ??
      units.find((u) => u.operationalStatus === "READY")?.id ??
      "",
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unit = units.find((u) => u.id === selected);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
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
          if (!(file instanceof File)) {
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
        {!revision && (
          <fieldset className="space-y-3">
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
                    required
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
        )}
        <h2 className="text-lg font-bold">Điều khoản</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            name="startDate"
            label="Ngày bắt đầu"
            defaultValue={startDate}
            required
          />
          <DateField
            name="endDate"
            label="Ngày kết thúc"
            defaultValue={endDate}
            required
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
              required
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
              required
            />
          </label>
        </div>
        <p className="text-sm text-muted">Thời hạn thuê tối thiểu 3 tháng.</p>
        <label className="grid gap-2 text-sm font-semibold">
          Tài liệu {revision ? "mới " : ""}(PDF, tối đa 10 MB)
          <input
            name="document"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="rounded-xl border border-line p-4"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required className="mt-1" />
          Tôi xác nhận đây là phiên bản chính xác mà tôi gửi đi.
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
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
        <Button className="w-full" disabled={pending}>
          {pending
            ? "Đang gửi…"
            : revision
              ? "Gửi phiên bản mới"
              : "Gửi đề xuất kỳ thuê"}
        </Button>
      </aside>
    </form>
  );
}
