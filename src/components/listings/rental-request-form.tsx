"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DateField } from "@/components/ui/date-field";
import { dong } from "@/components/listings/listing-format";
import { requestInput } from "@/domain/requests/request-input";
import { createRentalRequest } from "@/server/requests/create-rental-request";
export type RequestListing = {
  id: string;
  title: string;
  property: {
    name: string;
    ward?: string | null;
    city?: string | null;
    address_line?: string | null;
  };
  units: Array<{
    id: string;
    label: string;
    advertised_monthly_rent?: string;
    photos?: Array<{ url: string }>;
  }>;
  gallery?: Array<{ url: string }>;
};
export type RequestProfile = { fullName: string; phone: string };
export function RentalRequestForm({
  listing,
  isSignedIn,
  profile,
  preferredUnitId,
  onPreferredUnitChange,
  onCancel,
}: {
  listing: RequestListing;
  isSignedIn: boolean;
  profile?: RequestProfile;
  preferredUnitId: string;
  onPreferredUnitChange: (unitId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [moveOut, setMoveOut] = useState("");
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSignedIn) {
      router.push(`/auth/login?next=/listings/${listing.id}`);
      return;
    }
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const input = {
      contactName: String(values.get("contactName") ?? ""),
      contactPhone: String(values.get("contactPhone") ?? ""),
      desiredMoveInDate: String(values.get("desiredMoveInDate") ?? ""),
      desiredEndDate: String(values.get("desiredEndDate") ?? ""),
      preferredUnitId: preferredUnitId || undefined,
      message: String(values.get("message") ?? ""),
    };
    const parsed = requestInput.safeParse(input);
    setNotice("");
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const result = await createRentalRequest(listing.id, parsed.data);
      if (result.ok && result.data) setRequestId(result.data.requestId);
      else if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setNotice(result.error);
      }
    } catch {
      setNotice("Không gửi được yêu cầu. Thử lại.");
    } finally {
      setPending(false);
    }
  }
  const fieldClass =
    "min-h-12 w-full rounded-xl border border-[#c9d3e0] bg-white px-3.5 text-base font-normal text-[#1b2430]";
  const labelClass =
    "grid content-start gap-1.5 text-sm font-semibold text-[#2b3544]";
  const error = (name: string) =>
    errors[name] ? (
      <span role="alert" className="text-sm text-[#9b2c2c]">
        {errors[name]}
      </span>
    ) : null;
  if (requestId)
    return (
      <div role="status" className="grid gap-4">
        <h3 className="text-lg font-bold">Đã gửi yêu cầu thuê</h3>
        <p>Chủ nhà sẽ liên lạc với bạn qua số điện thoại đã cung cấp.</p>
        <Link
          className="font-semibold text-[#3368a0]"
          href={`/tenant/requests/${requestId}`}
        >
          Xem yêu cầu thuê
        </Link>
      </div>
    );
  return (
    <form
      className="grid gap-4 text-[#091216]"
      aria-label="Gửi yêu cầu thuê"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="flex items-center gap-3 rounded-[15px] bg-[#eaf1f7] p-3">
        {coverUrl(listing) ? (
          <Image
            src={coverUrl(listing) as string}
            alt=""
            width={76}
            height={58}
            unoptimized
            className="h-[58px] w-[76px] shrink-0 rounded-[10px] object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-base font-semibold leading-6">{listing.title}</p>
          <p className="text-[13px] leading-5 text-[#5b6676]">
            {listingSummary(listing)}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Tên liên hệ
          <input
            name="contactName"
            defaultValue={profile?.fullName}
            autoComplete="name"
            className={fieldClass}
            aria-invalid={!!errors.contactName}
          />
          {error("contactName")}
        </label>
        <label className={labelClass}>
          Số điện thoại
          <input
            name="contactPhone"
            defaultValue={profile?.phone}
            autoComplete="tel"
            inputMode="tel"
            className={fieldClass}
            aria-invalid={!!errors.contactPhone}
          />
          {error("contactPhone")}
        </label>
        <DateField
          picker
          name="desiredMoveInDate"
          label="Ngày dọn vào mong muốn"
          error={errors.desiredMoveInDate}
          onValueChange={setMoveIn}
        />
        <div className="grid content-start gap-1.5">
          <DateField
            picker
            name="desiredEndDate"
            label="Ngày kết thúc mong muốn"
            error={errors.desiredEndDate}
            onValueChange={setMoveOut}
          />
        </div>
      </div>
      <label className={labelClass}>
        Căn ưu tiên (tùy chọn)
        <select
          name="preferredUnitId"
          value={preferredUnitId}
          onChange={(event) => onPreferredUnitChange(event.target.value)}
          className={`${fieldClass} appearance-none bg-[length:10px_6px] bg-[position:right_16px_center] bg-no-repeat pr-10`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23454E5C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">Không có căn ưu tiên</option>
          {listing.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unitOption(unit)}
            </option>
          ))}
        </select>
        {error("preferredUnitId")}
      </label>
      <label className={labelClass}>
        Lời nhắn cho chủ nhà
        <textarea
          name="message"
          className={`${fieldClass} min-h-24 py-2.5`}
          aria-invalid={!!errors.message}
        />
        {error("message")}
      </label>
      <ol className="grid grid-cols-3 gap-2.5 border-t border-[#e1e7ed] pt-3.5 text-sm leading-5">
        {[
          "Chủ nhà liên lạc cho bạn",
          "Chủ nhà gửi đề xuất hợp đồng",
          "Bạn xác nhận hợp đồng",
        ].map((text, index) => (
          <li key={text}>
            <span className="mb-1.5 flex size-7 items-center justify-center rounded-full bg-[#eaf1f7] text-[13px] font-bold text-[#3368a0]">
              {index + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-[#5b6676]">
        Gửi yêu cầu không đồng nghĩa với việc giữ chỗ.
      </p>
      {notice ? (
        <p role="alert" className="text-sm text-[#9b2c2c]">
          {notice}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-[15px] border border-[#b9c9dc] px-5 text-[15px] font-semibold text-[#254e7a] hover:bg-[#eaf1f7]"
          >
            Hủy
          </button>
        ) : null}
        <button
          disabled={pending}
          type="submit"
          className="min-h-11 rounded-[15px] bg-[#3368a0] px-5 text-[15px] font-semibold text-white hover:bg-[#2b5a8c] disabled:opacity-60"
        >
          {pending ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
      </div>
    </form>
  );
}

function coverUrl(listing: RequestListing) {
  return (
    listing.gallery?.[0]?.url ??
    listing.units.find((unit) => unit.photos?.[0]?.url)?.photos?.[0]?.url
  );
}

function listingSummary(listing: RequestListing) {
  const place = [
    listing.property.ward || listing.property.address_line,
    listing.property.city,
  ]
    .filter(Boolean)
    .join(", ");
  const rents = listing.units
    .map((unit) => Number(unit.advertised_monthly_rent))
    .filter((rent) => Number.isFinite(rent) && rent > 0);
  const rent = rents.length ? `từ ${dong(Math.min(...rents))}/tháng` : "";
  return [place, rent, "Đã quảng cáo"].filter(Boolean).join(" · ");
}

function unitOption(unit: RequestListing["units"][number]) {
  const rent = Number(unit.advertised_monthly_rent);
  if (!Number.isFinite(rent) || rent <= 0) return unit.label;
  return `${unit.label} · ${dong(rent)}/tháng`;
}

function stayHint(moveIn: string, moveOut: string) {
  const months = stayMonths(moveIn, moveOut);
  return months ? `${months} tháng · tối thiểu 3 tháng` : "Tối thiểu 3 tháng";
}

function stayMonths(moveIn: string, moveOut: string) {
  if (!moveIn || !moveOut) return null;
  const start = new Date(`${moveIn}T00:00:00Z`);
  const end = new Date(`${moveOut}T00:00:00Z`);
  if (!(end > start)) return null;
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  const months = Math.round(days / 30.4375);
  return months > 0 ? months : null;
}
