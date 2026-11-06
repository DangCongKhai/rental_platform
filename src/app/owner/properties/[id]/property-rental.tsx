"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OwnerPropertyRental } from "@/lib/owner-types";
import {
  BedIcon,
  BuildingIcon,
  PencilIcon,
  SearchIcon,
  WrenchIcon,
} from "@/components/ui/icons";
import { formatRentalRange } from "../rental-format";
import {
  outlineButtonClass,
  StatusPill,
  textLinkClass,
} from "../status-pill";

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

export function PropertyRental({
  property,
}: {
  property: OwnerPropertyRental;
}) {
  const [query, setQuery] = useState("");
  const [rental, setRental] =
    useState<(typeof rentalFilters)[number]["value"]>("all");
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo mã căn (ví dụ: A101)"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
          <select
            value={rental}
            onChange={(event) =>
              setRental(
                event.target.value as (typeof rentalFilters)[number]["value"],
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
                      <Link
                        href={
                          `/owner/properties/${property.id}` +
                          `/units/${unit.id}`
                        }
                        className={textLinkClass}
                      >
                        Xem lịch sử
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
