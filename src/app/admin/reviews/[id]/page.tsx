import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReviewDecisionForm } from "@/components/admin/review-decision-form";
import { AMENITY_CATALOG } from "@/domain/amenities";
import { getReviewPackage } from "@/server/admin/review";

export const instant = false;

function addressLine(property: {
  addressLine: string | null;
  ward: string | null;
  city: string | null;
}) {
  return (
    [property.addressLine, property.ward, property.city]
      .filter(Boolean)
      .join(", ") || "Chưa có địa chỉ"
  );
}

function LabelValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-[#718096]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#273546]">{children}</dd>
    </div>
  );
}

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const data = await getReviewPackage(id);
  if (!data) notFound();
  const unitMedia = data.property.units.flatMap((unit) => unit.photos);
  const selectedMedia = [...data.property.media, ...unitMedia];
  const cover = selectedMedia.find((media) => media.id === data.coverMediaId);
  const checks = [
    [
      "Địa chỉ đầy đủ",
      Boolean(
        data.property.addressLine && data.property.ward && data.property.city,
      ),
    ],
    [
      "Có ảnh dùng chung và ảnh bìa",
      data.property.media.length > 0 && Boolean(cover),
    ],
    [
      "Mỗi căn có ảnh",
      data.property.units
        .filter(
          (unit) =>
            unit.isMarketed ||
            data.property.rentalArrangement === "WHOLE_SPACE",
        )
        .every((unit) => unit.photos.length > 0),
    ],
    ["Đã thiết lập chính sách", Boolean(data.property.policies)],
    [
      "Nội dung chưa đổi sau khi gửi",
      data.property.contentRevision === data.submittedContentRevision,
    ],
  ] as const;
  const canDecide =
    data.moderationStatus === "PENDING" &&
    data.property.contentRevision === data.submittedContentRevision &&
    data.submittedContentRevision !== null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-sm text-[#627184]">
          <Link
            href="/admin/reviews"
            className="text-[#1c4d78] hover:underline"
          >
            Hàng đợi kiểm duyệt
          </Link>{" "}
          / Gói tin đăng
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {data.title || data.property.name}
            </h1>
            <p className="mt-1 text-sm text-[#627184]">
              Chủ nhà {data.property.owner.fullName} · Gửi duyệt{" "}
              {data.submittedAt?.toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              }) ?? "—"}
            </p>
          </div>
          <span className="rounded-full bg-[#fff0cf] px-3 py-1 text-xs font-semibold text-[#825500]">
            {data.moderationStatus === "PENDING"
              ? "Đang duyệt"
              : data.moderationStatus === "APPROVED"
                ? "Đã duyệt"
                : "Đã từ chối"}
          </span>
        </div>
      </header>
      {data.moderationStatus !== "PENDING" && (
        <p
          role="status"
          className="rounded-xl border border-[#ead49d] bg-[#fff8e6] p-4 text-sm text-[#755200]"
        >
          Gói tin đã được quyết định:{" "}
          {data.moderationStatus === "APPROVED" ? "đã phê duyệt" : "đã từ chối"}
          . Không thể xử lý lại.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-[#dce3eb] bg-white p-5">
            <h2 className="font-bold">Bài đăng</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-[100px_minmax(0,1fr)]">
              <LabelValue label="Tiêu đề">
                {data.title || "Chưa đặt tiêu đề"}
              </LabelValue>
              <LabelValue label="Mô tả">
                {data.description || "Chưa có mô tả"}
              </LabelValue>
            </dl>
            <div className="mt-4">
              <h3 className="text-xs text-[#718096]">Ảnh bìa</h3>
              {cover?.url ? (
                <Image
                  src={cover.url}
                  alt={cover.caption || "Ảnh bìa tin đăng"}
                  width={520}
                  height={300}
                  unoptimized
                  loading="eager"
                  className="mt-2 h-44 w-full max-w-md rounded-xl object-cover"
                />
              ) : (
                <p className="mt-2 rounded-lg bg-[#eef2f6] p-6 text-center text-sm text-[#627184]">
                  Ảnh xem trước không khả dụng
                </p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-[#dce3eb] bg-white p-5">
            <h2 className="font-bold">Bất động sản</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <LabelValue label="Tên">{data.property.name}</LabelValue>
              <LabelValue label="Loại">{data.property.propertyType}</LabelValue>
              <LabelValue label="Hình thức">
                {data.property.rentalArrangement === "WHOLE_SPACE"
                  ? "Cho thuê toàn bộ"
                  : "Cho thuê từng căn/phòng"}
              </LabelValue>
              <LabelValue label="Địa chỉ">
                {addressLine(data.property)}
              </LabelValue>
              <LabelValue label="Mô tả">
                {data.property.description || "Chưa có mô tả"}
              </LabelValue>
              <LabelValue label="Chủ nhà">
                {data.property.owner.fullName} · {data.property.owner.email}
                {data.property.owner.phone
                  ? ` · ${data.property.owner.phone}`
                  : ""}
              </LabelValue>
              <LabelValue label="Tiện ích chung">
                <AmenitySummary value={data.property.sharedAmenities} />
              </LabelValue>
              <LabelValue label="Chính sách">
                <PolicySummary value={data.property.policies} />
              </LabelValue>
            </dl>
          </section>
          <section className="rounded-xl border border-[#dce3eb] bg-white p-5">
            <h2 className="font-bold">
              Danh sách căn ({data.property.units.length})
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.property.units.map((unit) => (
                <article
                  key={unit.id}
                  className="rounded-xl border border-[#e3e8ee] p-4"
                >
                  <div className="flex justify-between gap-2">
                    <h3 className="font-bold">{unit.label}</h3>
                    <span className="rounded-full bg-[#eef2f6] px-2 py-1 text-xs">
                      {unit.isMarketed ? "Đang quảng bá" : "Chưa quảng bá"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#627184]">
                    {unit.unitKind} · {unit.areaM2 ?? "—"} m² · {unit.bedrooms}{" "}
                    PN · {unit.bathrooms} PT
                  </p>
                  <p className="mt-2 text-sm">
                    {unit.advertisedMonthlyRent === null
                      ? "Chưa có giá thuê"
                      : `${unit.advertisedMonthlyRent.toLocaleString("vi-VN")} ₫/tháng`}{" "}
                    · Cọc{" "}
                    {unit.deposit === null
                      ? "chưa có"
                      : `${unit.deposit.toLocaleString("vi-VN")} ₫`}
                  </p>
                  <p className="mt-1 text-xs text-[#627184]">
                    Tối thiểu {unit.minimumRentalMonths} tháng · Tối đa{" "}
                    {unit.maxOccupants ?? "—"} người · {unit.operationalStatus}
                  </p>
                  <p className="mt-2 text-xs">
                    Tiện ích: <AmenitySummary value={unit.amenities} />
                  </p>
                  <p className="mt-1 text-xs">
                    Quy định riêng:{" "}
                    <PolicySummary value={unit.policyOverrides} unit />
                  </p>
                  <p className="mt-2 text-xs text-[#627184]">
                    {unit.photos.length} ảnh
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-[#dce3eb] bg-white p-5">
            <h2 className="font-bold">Bộ sưu tập ảnh đã chọn</h2>
            {selectedMedia.length === 0 ? (
              <p className="mt-3 text-sm text-[#718096]">
                Chưa có ảnh được chọn.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedMedia.map((media) =>
                  media.url ? (
                    <Image
                      key={`${media.id}-${media.caption ?? ""}`}
                      src={media.url}
                      alt={media.caption || "Ảnh bất động sản"}
                      width={320}
                      height={220}
                      unoptimized
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      key={media.id}
                      className="grid h-32 place-items-center rounded-lg bg-[#eef2f6] text-xs text-[#718096]"
                    >
                      Ảnh chưa tải được
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-xl border border-[#dce3eb] bg-white p-5">
            <h2 className="font-bold">Kiểm tra hồ sơ</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {checks.map(([label, okay]) => (
                <li
                  key={label}
                  className={okay ? "text-green-800" : "text-red-700"}
                >
                  {okay ? "✓" : "•"} {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#718096]">
              Revision hiện tại: {data.property.contentRevision}; lúc gửi:{" "}
              {data.submittedContentRevision ?? "—"}
            </p>
          </section>
          <ReviewDecisionForm
            listingId={data.id}
            expectedRevision={data.submittedContentRevision ?? 0}
            canDecide={canDecide}
          />
        </aside>
      </div>
    </div>
  );
}

function AmenitySummary({ value }: { value: unknown }) {
  if (!value || typeof value !== "object")
    return <span className="text-[#627184]">Chưa thiết lập</span>;
  const data = value as {
    standard?: Record<string, { enabled?: boolean; details?: string }>;
    custom?: unknown[];
  };
  const standard = Object.entries(data.standard ?? {})
    .filter(([, item]) => item.enabled)
    .map(([key, item]) => {
      const label =
        AMENITY_CATALOG.find((amenity) => amenity.key === key)?.label ?? key;
      return item.details ? `${label}: ${item.details}` : label;
    });
  const custom = (data.custom ?? []).filter(
    (item): item is string => typeof item === "string",
  );
  const labels = [...standard, ...custom];
  return (
    <span className="text-[#627184]">
      {labels.length ? labels.join(", ") : "Chưa thiết lập"}
    </span>
  );
}

function PolicySummary({
  value,
  unit = false,
}: {
  value: unknown;
  unit?: boolean;
}) {
  if (!value || typeof value !== "object")
    return <span className="text-[#627184]">Chưa thiết lập</span>;
  const data = value as {
    defaults?: { pets?: string; smoking?: string };
    overrides?: { pets?: string; smoking?: string };
    shared_rules?: unknown[];
    additional_rules?: unknown[];
  };
  const labels: Record<string, string> = {
    ALLOWED: "Cho phép",
    NOT_ALLOWED: "Không cho phép",
    ASK_OWNER: "Hỏi chủ nhà",
  };
  const rules = unit ? data.additional_rules : data.shared_rules;
  const pets = unit ? data.overrides?.pets : data.defaults?.pets;
  const smoking = unit ? data.overrides?.smoking : data.defaults?.smoking;
  const summary = [
    `Thú cưng: ${pets ? (labels[pets] ?? pets) : "Theo quy định chung"}`,
    `Hút thuốc: ${smoking ? (labels[smoking] ?? smoking) : "Theo quy định chung"}`,
    ...(rules ?? []).filter((rule): rule is string => typeof rule === "string"),
  ];
  return <span className="text-[#627184]">{summary.join(" · ")}</span>;
}
