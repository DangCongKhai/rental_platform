"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { generateUnitPreview, MAX_BULK_UNIT_COUNT, type UnitPreviewRow } from "@/domain/units";
import { createUnits } from "../../unit-actions";

export type UnitListItem = {
    id: string;
    label: string;
    unitKind: string;
    areaM2: number | null;
    advertisedMonthlyRent: number | null;
    deposit: number | null;
    minimumRentalMonths: number;
    maxOccupants: number | null;
    operationalStatus: string;
    isMarketed: boolean;
};

type PreviewRow = UnitPreviewRow & {
    bedrooms: number;
    bathrooms: number;
    bathroomArrangement: string;
};

const unitKinds = [
    ["STUDIO", "Studio"],
    ["ROOM", "Phòng riêng"],
    ["APARTMENT", "Căn hộ"],
    ["HOUSE", "Nhà riêng"],
] as const;

const statusLabels: Record<string, string> = {
    READY: "Sẵn sàng",
    MAINTENANCE: "Đang bảo trì",
    RETIRED: "Ngừng khai thác",
};

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function numberValue(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInput(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
}

function currencyNumberValue(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) : null;
}

function handleCurrencyInput(event: React.ChangeEvent<HTMLInputElement>, setValue: (value: string) => void) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, "").length;
    const digits = input.value.replace(/\D/g, "");
    const formatted = digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";

    setValue(formatted);

    requestAnimationFrame(() => {
        let nextCursor = 0;
        let digitsSeen = 0;

        while (nextCursor < formatted.length && digitsSeen < digitsBeforeCursor) {
            if (/\d/.test(formatted[nextCursor])) {
                digitsSeen += 1;
            }
            nextCursor += 1;
        }

        input.setSelectionRange(nextCursor, nextCursor);
    });
}

export function UnitManager({ propertyId, initialUnits }: { propertyId: string; initialUnits: UnitListItem[] }) {
    const [count, setCount] = useState(5);
    const [prefix, setPrefix] = useState("S");
    const [startNumber, setStartNumber] = useState(201);
    const [unitKind, setUnitKind] = useState("STUDIO");
    const [areaM2, setAreaM2] = useState("24");
    const [bedrooms, setBedrooms] = useState("0");
    const [bathrooms, setBathrooms] = useState("1");
    const [bathroomArrangement, setBathroomArrangement] = useState("PRIVATE");
    const [rent, setRent] = useState(() => formatCurrencyInput("3800000"));
    const [deposit, setDeposit] = useState(() => formatCurrencyInput("3800000"));
    const [minimumMonths, setMinimumMonths] = useState("3");
    const [occupants, setOccupants] = useState("2");
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const parsedDefaults = useMemo(
        () => ({
            area: numberValue(areaM2),
            bedrooms: numberValue(bedrooms),
            bathrooms: numberValue(bathrooms),
            rent: currencyNumberValue(rent),
            deposit: currencyNumberValue(deposit),
            minimumMonths: numberValue(minimumMonths),
            occupants: numberValue(occupants),
        }),
        [areaM2, bedrooms, bathrooms, rent, deposit, minimumMonths, occupants],
    );

    function makePreview() {
        setMessage(null);
        setErrors({});
        if (
            parsedDefaults.rent === null ||
            parsedDefaults.rent <= 0 ||
            parsedDefaults.deposit === null ||
            parsedDefaults.deposit < 0 ||
            parsedDefaults.minimumMonths === null ||
            parsedDefaults.minimumMonths < 3 ||
            parsedDefaults.bedrooms === null ||
            parsedDefaults.bathrooms === null ||
            (areaM2.trim() !== "" && (parsedDefaults.area === null || parsedDefaults.area <= 0)) ||
            (occupants.trim() !== "" && (parsedDefaults.occupants === null || parsedDefaults.occupants < 1))
        ) {
            setMessage("Kiểm tra giá thuê, tiền cọc, diện tích và các thông số mặc định.");
            return;
        }

        try {
            const generated = generateUnitPreview({
                count,
                prefix,
                startNumber,
                unitKind,
                areaM2: parsedDefaults.area,
                advertisedMonthlyRent: parsedDefaults.rent,
                deposit: parsedDefaults.deposit,
                minimumRentalMonths: parsedDefaults.minimumMonths,
                maxOccupants: parsedDefaults.occupants,
            });
            setRows(
                generated.map((row) => ({
                    ...row,
                    bedrooms: parsedDefaults.bedrooms!,
                    bathrooms: parsedDefaults.bathrooms!,
                    bathroomArrangement,
                })),
            );
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Không thể tạo danh sách xem trước.");
        }
    }

    function updateRow<K extends keyof PreviewRow>(index: number, key: K, value: PreviewRow[K]) {
        setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
        setErrors((current) => {
            const next = { ...current };
            delete next[`rows.${index}.${String(key)}`];
            return next;
        });
    }

    function saveRows() {
        setMessage(null);
        setErrors({});
        startTransition(async () => {
            const result = await createUnits(
                propertyId,
                rows.map((row) => ({
                    label: row.label,
                    unitKind: row.unitKind,
                    areaM2: row.areaM2,
                    bedrooms: row.bedrooms,
                    bathrooms: row.bathrooms,
                    bathroomArrangement: row.bathroomArrangement,
                    advertisedMonthlyRent: row.advertisedMonthlyRent,
                    deposit: row.deposit,
                    minimumRentalMonths: row.minimumRentalMonths,
                    maxOccupants: row.maxOccupants,
                })),
            );
            if (!result.ok) {
                setMessage(result.error);
                setErrors(result.fieldErrors ?? {});
                return;
            }
            setRows([]);
            window.location.reload();
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-ink">Căn/phòng đã tạo</h2>
                        <p className="mt-1 text-sm text-subtle">Quản lý giá thuê, tình trạng vận hành và trạng thái quảng bá.</p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-deep">{initialUnits.length} căn/phòng</span>
                </div>

                {initialUnits.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center">
                        <p className="font-semibold text-ink">Chưa có căn/phòng nào</p>
                        <p className="mt-1 text-sm text-subtle">Tạo một nhóm căn bên dưới để bắt đầu quản lý.</p>
                    </div>
                ) : (
                    <div className="mt-5 overflow-x-auto rounded-xl border border-line">
                        <table className="w-full min-w-[850px] border-collapse text-left">
                            <thead className="bg-surface text-sm text-subtle">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Căn/phòng</th>
                                    <th className="px-4 py-3 font-semibold">Loại · diện tích</th>
                                    <th className="px-4 py-3 font-semibold">Giá thuê/tháng</th>
                                    <th className="px-4 py-3 font-semibold">Tiền cọc</th>
                                    <th className="px-4 py-3 font-semibold">Người ở tối đa</th>
                                    <th className="px-4 py-3 font-semibold">Thời hạn tối thiểu</th>
                                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                                    <th className="px-4 py-3 font-semibold">Quảng bá</th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Thao tác</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialUnits.map((unit) => (
                                    <tr key={unit.id} className="border-t border-line-soft text-sm text-ink-2">
                                        <td className="px-4 py-3 font-semibold">{unit.label}</td>
                                        <td className="px-4 py-3">
                                            {unit.unitKind}
                                            {unit.areaM2 ? ` · ${unit.areaM2} m²` : ""}
                                        </td>
                                        <td className="px-4 py-3">
                                            {unit.advertisedMonthlyRent === null ? "Chưa đặt" : `${money.format(unit.advertisedMonthlyRent)} ₫`}
                                        </td>
                                        <td className="px-4 py-3">{unit.deposit === null ? "—" : `${money.format(unit.deposit)} ₫`}</td>
                                        <td className="px-4 py-3">{unit.maxOccupants ?? "—"}</td>
                                        <td className="px-4 py-3">{unit.minimumRentalMonths} tháng</td>
                                        <td className="px-4 py-3">{statusLabels[unit.operationalStatus] ?? unit.operationalStatus}</td>
                                        <td className="px-4 py-3">{unit.isMarketed ? "Đang quảng bá" : "Chưa quảng bá"}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/owner/properties/${propertyId}/units/${unit.id}`}
                                                className="font-semibold text-brand-deep hover:underline">
                                                Chỉnh sửa
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
                <div>
                    <h2 className="text-xl font-bold text-ink">Tạo hàng loạt căn/phòng</h2>
                    <p className="mt-1 text-sm text-subtle">Nhập quy tắc đặt tên và thông tin mặc định, sau đó kiểm tra từng dòng trước khi lưu.</p>
                </div>

                <div className="mt-5 rounded-2xl bg-surface p-4 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Số căn/phòng
                            <input
                                type="number"
                                min={1}
                                max={MAX_BULK_UNIT_COUNT}
                                value={count}
                                onChange={(event) => setCount(Number(event.target.value))}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Tiền tố
                            <input
                                value={prefix}
                                onChange={(event) => setPrefix(event.target.value)}
                                maxLength={20}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Số bắt đầu
                            <input
                                type="number"
                                min={1}
                                value={startNumber}
                                onChange={(event) => setStartNumber(Number(event.target.value))}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Loại căn
                            <select
                                value={unitKind}
                                onChange={(event) => setUnitKind(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            >
                                {unitKinds.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Diện tích (m²)
                            <input
                                type="number"
                                min={0.1}
                                step="0.1"
                                value={areaM2}
                                onChange={(event) => setAreaM2(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Phòng ngủ
                            <input
                                type="number"
                                min={0}
                                value={bedrooms}
                                onChange={(event) => setBedrooms(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Phòng tắm
                            <input
                                type="number"
                                min={0}
                                step="0.5"
                                value={bathrooms}
                                onChange={(event) => setBathrooms(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Phòng tắm
                            <select
                                value={bathroomArrangement}
                                onChange={(event) => setBathroomArrangement(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            >
                                <option value="PRIVATE">Riêng</option>
                                <option value="SHARED">Dùng chung</option>
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Giá thuê/tháng (₫)
                            <input
                                type="text"
                                inputMode="numeric"
                                value={rent}
                                onChange={(event) => handleCurrencyInput(event, setRent)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Tiền cọc (₫)
                            <input
                                type="text"
                                inputMode="numeric"
                                value={deposit}
                                onChange={(event) => handleCurrencyInput(event, setDeposit)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Tháng thuê tối thiểu
                            <input
                                type="number"
                                min={3}
                                value={minimumMonths}
                                onChange={(event) => setMinimumMonths(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Số người tối đa
                            <input
                                type="number"
                                min={1}
                                value={occupants}
                                onChange={(event) => setOccupants(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-ink"
                            />
                        </label>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-subtle">Có thể sửa tên và giá trị ngay trong bảng xem trước.</p>
                        <button
                            type="button"
                            onClick={makePreview}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line-brand bg-white px-4 font-semibold text-brand-deep hover:bg-brand-soft"
                        >
                            Tạo danh sách xem trước
                        </button>
                    </div>
                </div>

                {message && (
                    <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-[#fff8f7] px-4 py-3 text-sm text-danger-ink">
                        {message}
                    </p>
                )}

                {rows.length > 0 && (
                    <div className="mt-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-ink">Xem trước {rows.length} căn/phòng</h3>
                                <p className="text-sm text-subtle">Nếu có một dòng không hợp lệ, toàn bộ nhóm sẽ không được lưu.</p>
                            </div>
                            <button
                                type="button"
                                onClick={saveRows}
                                disabled={isPending}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                            >
                                {isPending ? "Đang lưu…" : "Lưu tất cả căn/phòng"}
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-line">
                            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                                <thead className="bg-surface text-subtle">
                                    <tr>
                                        <th className="px-3 py-3">Tên căn</th>
                                        <th className="px-3 py-3">Loại</th>
                                        <th className="px-3 py-3">Diện tích</th>
                                        <th className="px-3 py-3">Giá thuê/tháng</th>
                                        <th className="px-3 py-3">Tiền cọc</th>
                                        <th className="px-3 py-3">Tối thiểu (tháng)</th>
                                        <th className="px-3 py-3">Người tối đa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={row.rowId} className="border-t border-line-soft align-top">
                                            <td className="min-w-36 px-3 py-3">
                                                <input
                                                    aria-label={`Tên căn dòng ${index + 1}`}
                                                    value={row.label}
                                                    onChange={(event) => updateRow(index, "label", event.target.value)}
                                                    className="min-h-10 w-full rounded-lg border border-line-strong bg-white px-2.5"
                                                />
                                                {errors[`rows.${index}.label`] && (
                                                    <p className="mt-1 text-xs text-danger-ink">{errors[`rows.${index}.label`]}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">{unitKinds.find(([value]) => value === row.unitKind)?.[1] ?? row.unitKind}</td>
                                            <td className="px-3 py-3">{row.areaM2 ?? "—"} m²</td>
                                            <td className="min-w-40 px-3 py-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={row.advertisedMonthlyRent}
                                                    onChange={(event) => updateRow(index, "advertisedMonthlyRent", Number(event.target.value))}
                                                    className="min-h-10 w-full rounded-lg border border-line-strong px-2.5"
                                                />
                                                {errors[`rows.${index}.advertisedMonthlyRent`] && (
                                                    <p className="mt-1 text-xs text-danger-ink">{errors[`rows.${index}.advertisedMonthlyRent`]}</p>
                                                )}
                                            </td>
                                            <td className="min-w-36 px-3 py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={row.deposit}
                                                    onChange={(event) => updateRow(index, "deposit", Number(event.target.value))}
                                                    className="min-h-10 w-full rounded-lg border border-line-strong px-2.5"
                                                />
                                            </td>
                                            <td className="min-w-28 px-3 py-3">
                                                <input
                                                    type="number"
                                                    min={3}
                                                    value={row.minimumRentalMonths}
                                                    onChange={(event) => updateRow(index, "minimumRentalMonths", Number(event.target.value))}
                                                    className="min-h-10 w-full rounded-lg border border-line-strong px-2.5"
                                                />
                                            </td>
                                            <td className="min-w-28 px-3 py-3">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={row.maxOccupants ?? ""}
                                                    onChange={(event) => updateRow(index, "maxOccupants", numberValue(event.target.value))}
                                                    className="min-h-10 w-full rounded-lg border border-line-strong px-2.5"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
