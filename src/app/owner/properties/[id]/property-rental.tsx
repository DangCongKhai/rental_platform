"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  propertyTypeLabel,
  rentalArrangementLabel,
} from "@/domain/properties/labels";
import type {
  AmenityDocument,
  OwnerPropertyDetail,
  OwnerPropertyRental,
  PropertyPolicies,
} from "@/lib/owner-types";
import {
  BedIcon,
  BuildingIcon,
  PencilIcon,
  SearchIcon,
  WrenchIcon,
} from "@/components/ui/icons";
import { formatRentalRange } from "../components/rental-format";
import {
  outlineButtonClass,
  StatusPill,
  textLinkClass,
} from "../components/status-pill";

const rentalFilters = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "OCCUPIED", label: "Đang thuê" },
  { value: "VACANT", label: "Còn trống" },
  { value: "PENDING_CONFIRMATION", label: "Đang chờ xác nhận" },
  { value: "AWAITING_MOVE_IN", label: "Chờ dọn vào" },
] as const;

const cards = [
  {
    key: "total",
    label: "Tổng số căn",
    icon: BuildingIcon,
    tone: "bg-slate-100 text-slate-600",
  },
  {
    key: "occupied",
    label: "Đang thuê",
    icon: BedIcon,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "vacant",
    label: "Còn trống",
    icon: BedIcon,
    tone: "bg-amber-100 text-amber-800",
  },
  {
    key: "maintenance",
    label: "Bảo trì",
    icon: WrenchIcon,
    tone: "bg-orange-100 text-orange-700",
  },
] as const;

const fieldClass = [
  "h-10 rounded-xl border border-slate-200 bg-white",
  "px-3 text-sm text-slate-800",
].join(" ");

const policyLabels: Record<string, string> = {
  NOT_ALLOWED: "Không cho phép",
  WITH_APPROVAL: "Cần phê duyệt",
  ALLOWED: "Được phép",
  OUTDOOR_ONLY: "Chỉ khu vực ngoài trời",
  ASK_OWNER: "Hỏi chủ nhà",
};

function unitEditHref(property: OwnerPropertyRental, unitId: string) {
  if (property.rental_arrangement === "WHOLE_SPACE") {
    return `/owner/properties/${property.id}/edit`;
  }
  return `/owner/properties/${property.id}/units/${unitId}/edit`;
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

export function PropertyRental({
  property,
  detail,
  amenityLabels,
}: {
  property: OwnerPropertyRental;
  detail: OwnerPropertyDetail;
  amenityLabels: Record<string, string>;
}) {
  const [tab, setTab] = useState<"overview" | "occupancy">("overview");
  const [query, setQuery] = useState("");
  const [rental, setRental] =
    useState<(typeof rentalFilters)[number]["value"]>("all");
  const wholeSpace = property.rental_arrangement === "WHOLE_SPACE";
  const units = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    return property.units.filter((unit) => {
      const matchesLabel =
        needle.length === 0 ||
        unit.label.toLocaleLowerCase("vi").includes(needle);
      const matchesRental = rental === "all" || unit.rental === rental;
      return matchesLabel && matchesRental;
    });
  }, [property.units, query, rental]);

  return (
    <section
      className={[
        "mx-auto flex w-full max-w-6xl flex-col gap-5",
        "px-1 py-4 sm:px-2 sm:py-6",
      ].join(" ")}
    >
      <div>
        <Link
          href="/owner/properties"
          className="text-sm font-semibold text-[#3368a0] hover:underline"
        >
          ← Bất động sản
        </Link>
        <div
          className={[
            "mt-3 flex flex-col gap-4 sm:flex-row",
            "sm:items-start sm:justify-between",
          ].join(" ")}
        >
          <div>
            <h1
              className={[
                "text-2xl font-bold tracking-tight",
                "text-slate-900 sm:text-3xl",
              ].join(" ")}
            >
              {property.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{property.address}</p>
            <p className="mt-1 text-sm text-slate-500">
              {property.property_type_label}
              {" · "}
              {property.rental_arrangement_label}
            </p>
          </div>
          <Link
            href={`/owner/properties/${property.id}/edit`}
            className={`${outlineButtonClass} gap-2`}
          >
            <PencilIcon className="size-4" />
            Chỉnh sửa
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["overview", "Tổng quan"],
            ["occupancy", "Tình trạng thuê"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold",
              tab === value
                ? "bg-[#3368a0] text-white"
                : "border border-slate-200 bg-white text-slate-700",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <PropertyOverview
          detail={detail}
          amenityLabels={amenityLabels}
          wholeSpace={wholeSpace}
        />
      ) : (
        <OccupancyPanel
          property={property}
          units={units}
          wholeSpace={wholeSpace}
          query={query}
          rental={rental}
          onQuery={setQuery}
          onRental={setRental}
        />
      )}
    </section>
  );
}

function OccupancyPanel({
  property,
  units,
  wholeSpace,
  query,
  rental,
  onQuery,
  onRental,
}: {
  property: OwnerPropertyRental;
  units: OwnerPropertyRental["units"];
  wholeSpace: boolean;
  query: string;
  rental: (typeof rentalFilters)[number]["value"];
  onQuery: (value: string) => void;
  onRental: (value: (typeof rentalFilters)[number]["value"]) => void;
}) {
  return (
    <>
      {wholeSpace ? null : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <li
                key={card.key}
                className={[
                  "flex items-center gap-3 rounded-2xl",
                  "border border-slate-200 bg-white px-4 py-4",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-11 items-center justify-center",
                    "rounded-xl",
                    card.tone,
                  ].join(" ")}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm text-slate-500">
                    {card.label}
                  </span>
                  <span className="block text-2xl font-bold text-slate-900">
                    {property.counts[card.key]}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {wholeSpace ? null : (
          <div
            className={[
              "flex flex-col gap-3 border-b border-slate-100",
              "p-4 sm:flex-row",
            ].join(" ")}
          >
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className={[
                  "pointer-events-none absolute top-1/2 left-3",
                  "size-4 -translate-y-1/2 text-slate-400",
                ].join(" ")}
              />
              <input
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Tìm theo mã căn (ví dụ: A101)"
                className={`${fieldClass} w-full pl-9`}
              />
            </div>
            <select
              value={rental}
              onChange={(event) =>
                onRental(
                  event.target
                    .value as (typeof rentalFilters)[number]["value"],
                )
              }
              aria-label="Tất cả trạng thái"
              className={fieldClass}
            >
              {rentalFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {property.units.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Bất động sản này chưa có căn.
          </p>
        ) : units.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Không có căn phù hợp.
          </p>
        ) : (
          <div className="overflow-auto">
            <table
              className={[
                "w-full min-w-[860px] border-collapse",
                "text-left text-sm",
              ].join(" ")}
            >
              <thead
                className={[
                  "bg-slate-50 text-xs font-semibold",
                  "text-slate-500",
                ].join(" ")}
              >
                <tr>
                  <th className="px-4 py-3">Mã căn</th>
                  <th className="px-4 py-3">Trạng thái vận hành</th>
                  <th className="px-4 py-3">Trạng thái thuê</th>
                  <th className="px-4 py-3">Người thuê hiện tại</th>
                  <th className="px-4 py-3">Thời hạn thuê</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {unit.label}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={unit.operational}>
                        {unit.operational_label}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={unit.rental}>
                        {unit.rental_label}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {unit.tenant_name ?? "—"}
                    </td>
                    <td
                      className={[
                        "px-4 py-3 whitespace-nowrap",
                        "text-slate-700",
                      ].join(" ")}
                    >
                      {formatRentalRange(unit.start_date, unit.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={
                            `/owner/properties/${property.id}` +
                            `/units/${unit.id}`
                          }
                          className={textLinkClass}
                        >
                          Xem lịch sử
                        </Link>
                        <Link
                          href={unitEditHref(property, unit.id)}
                          className={textLinkClass}
                        >
                          Chỉnh sửa
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function PropertyOverview({
  detail,
  amenityLabels,
  wholeSpace,
}: {
  detail: OwnerPropertyDetail;
  amenityLabels: Record<string, string>;
  wholeSpace: boolean;
}) {
  const unit = detail.units.find((item) => !item.archived_at);
  const address =
    [detail.address_line, detail.ward, detail.city]
      .filter(Boolean)
      .join(", ") || "Chưa nhập địa chỉ";
  const amenities = wholeSpace
    ? mergeAmenities(detail.shared_amenities, unit?.amenities)
    : detail.shared_amenities;

  return (
    <div
      className={[
        "grid gap-6 rounded-2xl border border-slate-200",
        "bg-white p-4 sm:p-6",
      ].join(" ")}
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label="Tên bất động sản" value={detail.name} />
        <Fact
          label="Loại bất động sản"
          value={propertyTypeLabel(detail.property_type)}
        />
        <Fact
          label="Cách cho thuê"
          value={rentalArrangementLabel(detail.rental_arrangement)}
        />
        <Fact label="Địa chỉ" value={address} />
        <Fact
          label="Mô tả bất động sản"
          value={detail.description || "—"}
          wide
        />
      </dl>
      {wholeSpace && unit ? (
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Fact
            label="Diện tích (m²)"
            value={unit.area_m2 === null ? "—" : String(unit.area_m2)}
          />
          <Fact label="Phòng ngủ" value={String(unit.bedrooms)} />
          <Fact label="Phòng tắm" value={String(unit.bathrooms)} />
          <Fact
            label="Thời hạn thuê tối thiểu (tháng)"
            value={String(unit.minimum_rental_months)}
          />
          <Fact
            label="Giá thuê tháng"
            value={money(unit.advertised_monthly_rent)}
          />
          <Fact label="Tiền đặt cọc" value={money(unit.deposit)} />
          <Fact
            label="Số người tối đa"
            value={
              unit.max_occupants === null
                ? "—"
                : String(unit.max_occupants)
            }
          />
          <Fact
            label="Mô tả căn"
            value={unit.description || "—"}
            wide
          />
        </dl>
      ) : null}
      <AmenityList
        title={wholeSpace ? "Tiện nghi" : "Tiện nghi dùng chung"}
        amenities={amenities}
        labels={amenityLabels}
      />
      <HouseRules policies={detail.policies} />
    </div>
  );
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-4" : undefined}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm whitespace-pre-wrap text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function AmenityList({
  title,
  amenities,
  labels,
}: {
  title: string;
  amenities: AmenityDocument;
  labels: Record<string, string>;
}) {
  const enabled = Object.entries(amenities.standard).filter(
    ([, item]) => item.enabled,
  );
  const custom = amenities.custom.filter(Boolean);
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {enabled.length === 0 && custom.length === 0 ? (
        <p className="text-sm text-slate-600">Chưa chọn tiện nghi.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {enabled.map(([key, item]) => (
            <li
              key={key}
              className={[
                "rounded-lg border border-slate-200",
                "px-3 py-2 text-sm text-slate-700",
              ].join(" ")}
            >
              {labels[key] ?? key}
              {item.details ? (
                <span className="mt-1 block text-xs text-slate-500">
                  {item.details}
                </span>
              ) : null}
            </li>
          ))}
          {custom.map((item) => (
            <li
              key={item}
              className={[
                "rounded-lg border border-slate-200",
                "px-3 py-2 text-sm text-slate-700",
              ].join(" ")}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HouseRules({ policies }: { policies: PropertyPolicies }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-800">
        Quy định dùng chung
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact
          label="Thú cưng"
          value={policyLabels[policies.pets] ?? policies.pets}
        />
        <Fact
          label="Hút thuốc"
          value={policyLabels[policies.smoking] ?? policies.smoking}
        />
        <Fact
          label="Quy định khác"
          value={
            policies.shared_rules.length
              ? policies.shared_rules.join("\n")
              : "—"
          }
          wide
        />
      </dl>
    </section>
  );
}

function mergeAmenities(
  shared: AmenityDocument,
  unit: AmenityDocument | undefined,
): AmenityDocument {
  return {
    schema_version: 1,
    standard: { ...shared.standard, ...unit?.standard },
    custom: [...shared.custom, ...(unit?.custom ?? [])],
  };
}
