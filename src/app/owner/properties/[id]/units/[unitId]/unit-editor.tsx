"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getAmenityCatalog, normalizeAmenityText, type AmenityKey, type Amenities } from "@/domain/amenities";
import {
    type PolicyValue,
    type UnitPolicyOverrides,
} from "@/domain/policies";
import { buttonClass } from "@/components/ui/button";
import { updateUnit } from "../../../unit-actions";

type UnitEditorData = {
    id: string;
    label: string;
    unitKind: string;
    description: string | null;
    floor: string | null;
    areaM2: number | null;
    bedrooms: number;
    bathrooms: number;
    bathroomArrangement: string;
    advertisedMonthlyRent: number | null;
    deposit: number | null;
    minimumRentalMonths: number;
    maxOccupants: number | null;
    operationalStatus: string;
    isMarketed: boolean;
    amenities: Amenities;
    policyOverrides: UnitPolicyOverrides;
};

const unitKinds = [
    ["STUDIO", "Studio"],
    ["ROOM", "Phòng riêng"],
    ["APARTMENT", "Căn hộ"],
    ["HOUSE", "Nhà riêng"],
] as const;

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function formatCurrencyInput(value: number | null) {
    return value === null ? "" : money.format(value);
}

function currencyNumberValue(value: string) {
    const digits = value.replace(/\D/gu, "");
    return digits ? Number(digits) : null;
}

function numberValue(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function handleCurrencyInput(
    event: React.ChangeEvent<HTMLInputElement>,
    setValue: (value: string) => void,
) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/gu, "").length;
    const digits = input.value.replace(/\D/gu, "");
    const formatted = digits ? money.format(Number(digits)) : "";
    setValue(formatted);

    requestAnimationFrame(() => {
        let nextCursor = 0;
        let digitsSeen = 0;
        while (nextCursor < formatted.length && digitsSeen < digitsBeforeCursor) {
            if (/\d/u.test(formatted[nextCursor])) digitsSeen += 1;
            nextCursor += 1;
        }
        input.setSelectionRange(nextCursor, nextCursor);
    });
}

export function UnitEditor({
    propertyId,
    propertyName,
    sharedRules,
    unit,
}: {
    propertyId: string;
    propertyName: string;
    sharedRules: string[];
    unit: UnitEditorData;
}) {
    const router = useRouter();
    const [label, setLabel] = useState(unit.label);
    const [unitKind, setUnitKind] = useState(unit.unitKind);
    const [description, setDescription] = useState(unit.description ?? "");
    const [floor, setFloor] = useState(unit.floor ?? "");
    const [areaM2, setAreaM2] = useState(unit.areaM2?.toString() ?? "");
    const [bedrooms, setBedrooms] = useState(unit.bedrooms.toString());
    const [bathrooms, setBathrooms] = useState(unit.bathrooms.toString());
    const [bathroomArrangement, setBathroomArrangement] = useState(unit.bathroomArrangement);
    const [rent, setRent] = useState(() => formatCurrencyInput(unit.advertisedMonthlyRent));
    const [deposit, setDeposit] = useState(() => formatCurrencyInput(unit.deposit));
    const [minimumMonths, setMinimumMonths] = useState(unit.minimumRentalMonths.toString());
    const [occupants, setOccupants] = useState(unit.maxOccupants?.toString() ?? "");
    const [operationalStatus, setOperationalStatus] = useState(unit.operationalStatus);
    const [isMarketed, setIsMarketed] = useState(unit.isMarketed);
    const [amenities, setAmenities] = useState(unit.amenities);
    const [policyOverrides, setPolicyOverrides] = useState(unit.policyOverrides);
    const [newAmenity, setNewAmenity] = useState("");
    const [newRule, setNewRule] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const amenityOptions = getAmenityCatalog("UNIT");

    function toggleAmenity(key: AmenityKey) {
        setAmenities((current) => {
            const standard = { ...current.standard };
            if (standard[key]?.enabled) delete standard[key];
            else standard[key] = { enabled: true };
            return { ...current, standard };
        });
    }

    function addCustomAmenity() {
        const normalized = normalizeAmenityText(newAmenity);
        if (!normalized) return;
        setAmenities((current) => ({ ...current, custom: [...current.custom, normalized] }));
        setNewAmenity("");
    }

    function setPolicyOverride(key: "pets" | "smoking", value: string) {
        setPolicyOverrides((current) => {
            const overrides = { ...current.overrides };
            if (value) overrides[key] = value as PolicyValue;
            else delete overrides[key];
            return { ...current, overrides };
        });
    }

    function addAdditionalRule() {
        const normalized = normalizeAmenityText(newRule);
        if (!normalized) return;
        setPolicyOverrides((current) => ({
            ...current,
            additional_rules: [...current.additional_rules, normalized],
        }));
        setNewRule("");
    }

    function save() {
        setMessage("");
        setFieldErrors({});
        const bedroomCount = numberValue(bedrooms);
        const bathroomCount = numberValue(bathrooms);
        const area = numberValue(areaM2);
        const minimum = numberValue(minimumMonths);
        const occupantCount = numberValue(occupants);
        const monthlyRent = currencyNumberValue(rent);
        const depositAmount = currencyNumberValue(deposit);

        if (!label.trim() || bedroomCount === null || bathroomCount === null || minimum === null) {
            setMessage("Hãy kiểm tra tên căn, số phòng ngủ, phòng tắm và thời hạn thuê.");
            return;
        }
        if (areaM2.trim() && (area === null || area <= 0)) {
            setFieldErrors({ areaM2: "Diện tích phải lớn hơn 0." });
            return;
        }
        if (minimum < 3 || (occupants.trim() && (occupantCount === null || occupantCount < 1))) {
            setMessage("Thời hạn tối thiểu phải từ 3 tháng; số người tối đa phải từ 1.");
            return;
        }
        if (isMarketed && (monthlyRent === null || monthlyRent <= 0)) {
            setFieldErrors({ advertisedMonthlyRent: "Nhập giá thuê lớn hơn 0 để quảng bá căn này." });
            return;
        }
        if (depositAmount !== null && depositAmount < 0) {
            setFieldErrors({ deposit: "Tiền cọc không được âm." });
            return;
        }

        startTransition(async () => {
            try {
                const result = await updateUnit(unit.id, {
                    label,
                    unitKind,
                    description: description.trim() || null,
                    floor: floor.trim() || null,
                    areaM2: areaM2.trim() ? area : null,
                    bedrooms: bedroomCount,
                    bathrooms: bathroomCount,
                    bathroomArrangement,
                    advertisedMonthlyRent: monthlyRent,
                    deposit: depositAmount,
                    minimumRentalMonths: minimum,
                    maxOccupants: occupants.trim() ? occupantCount : null,
                    operationalStatus,
                    isMarketed,
                    amenities,
                    policyOverrides,
                });

                if (!result.ok) {
                    setMessage(result.error);
                    setFieldErrors(result.fieldErrors ?? {});
                    return;
                }

                router.push(`/owner/properties/${propertyId}/units`);
                router.refresh();
            } catch {
                setMessage("Không thể lưu thay đổi. Vui lòng thử lại.");
            }
        });
    }

    return (
        <section className="mx-auto w-full max-w-5xl space-y-5">
            <header className="space-y-2">
                <nav aria-label="Đường dẫn" className="text-sm text-subtle">
                    <Link href={`/owner/properties/${propertyId}/units`} className="hover:text-brand">
                        Căn/phòng
                    </Link>
                    <span aria-hidden="true"> / </span>
                    <span>{propertyName}</span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight text-ink">Chỉnh sửa {unit.label}</h1>
                <p className="text-sm text-subtle">Cập nhật thông tin và điều kiện thuê riêng cho căn/phòng này.</p>
            </header>

            <div className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
                <section className="grid gap-4 rounded-xl bg-surface p-4 sm:grid-cols-2 sm:p-5">
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Tên căn/phòng
                        <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                        {fieldErrors.label && <span className="block text-xs text-danger-ink">{fieldErrors.label}</span>}
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Loại căn/phòng
                        <select value={unitKind} onChange={(event) => setUnitKind(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3">
                            {unitKinds.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Tầng
                        <input value={floor} onChange={(event) => setFloor(event.target.value)} maxLength={40} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Diện tích (m²)
                        <input type="number" min={0.1} step="0.1" value={areaM2} onChange={(event) => setAreaM2(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                        {fieldErrors.areaM2 && <span className="block text-xs text-danger-ink">{fieldErrors.areaM2}</span>}
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Phòng ngủ
                        <input type="number" min={0} value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Phòng tắm
                        <input type="number" min={0} step="0.5" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                        Phòng tắm
                        <select value={bathroomArrangement} onChange={(event) => setBathroomArrangement(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3">
                            <option value="PRIVATE">Riêng</option>
                            <option value="SHARED">Dùng chung</option>
                        </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-ink-3 sm:col-span-2">
                        Mô tả
                        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-xl border border-line-strong bg-white p-3" />
                    </label>
                </section>

                <section className="space-y-4 rounded-xl bg-surface p-4 sm:p-5">
                    <h2 className="font-semibold text-ink">Giá thuê và điều kiện</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Giá thuê/tháng (₫)
                            <input inputMode="numeric" value={rent} onChange={(event) => handleCurrencyInput(event, setRent)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                            {fieldErrors.advertisedMonthlyRent && <span className="block text-xs text-danger-ink">{fieldErrors.advertisedMonthlyRent}</span>}
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Tiền cọc (₫)
                            <input inputMode="numeric" value={deposit} onChange={(event) => handleCurrencyInput(event, setDeposit)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                            {fieldErrors.deposit && <span className="block text-xs text-danger-ink">{fieldErrors.deposit}</span>}
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Thời hạn tối thiểu (tháng)
                            <input type="number" min={3} value={minimumMonths} onChange={(event) => setMinimumMonths(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                        </label>
                        <label className="space-y-1.5 text-sm font-semibold text-ink-3">
                            Số người tối đa
                            <input type="number" min={1} value={occupants} onChange={(event) => setOccupants(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3" />
                        </label>
                    </div>
                    <label className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm font-medium text-ink">
                        <input type="checkbox" checked={isMarketed} onChange={(event) => setIsMarketed(event.target.checked)} className="size-4 accent-brand" />
                        Quảng bá căn/phòng này
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-ink-3">
                        Trạng thái vận hành
                        <select value={operationalStatus} onChange={(event) => setOperationalStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3">
                            <option value="READY">Sẵn sàng</option>
                            <option value="MAINTENANCE">Đang bảo trì</option>
                            <option value="RETIRED">Ngừng khai thác</option>
                        </select>
                    </label>
                </section>

                <section className="space-y-3 rounded-xl bg-surface p-4 sm:p-5">
                    <h2 className="font-semibold text-ink">Tiện ích riêng</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {amenityOptions.map((amenity) => {
                            const selected = amenities.standard[amenity.key]?.enabled === true;
                            return (
                                <li key={amenity.key}>
                                    <button type="button" aria-pressed={selected} onClick={() => toggleAmenity(amenity.key)} className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm ${selected ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-white text-ink-2"}`}>
                                        <span>{amenity.label}</span><span aria-hidden="true">{selected ? "✓" : "+"}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                        {amenities.custom.map((item, index) => (
                            <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-sm">
                                {item}
                                <button type="button" aria-label={`Xóa tiện ích ${item}`} onClick={() => setAmenities((current) => ({ ...current, custom: current.custom.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input value={newAmenity} onChange={(event) => setNewAmenity(event.target.value)} maxLength={80} placeholder="Tiện ích khác" className="min-h-11 min-w-48 flex-1 rounded-xl border border-line-strong bg-white px-3" />
                        <button type="button" onClick={addCustomAmenity} disabled={!newAmenity.trim()} className={buttonClass({ variant: "secondary" })}>Thêm tiện ích</button>
                    </div>
                </section>

                <section className="space-y-4 rounded-xl bg-surface p-4 sm:p-5">
                    <h2 className="font-semibold text-ink">Quy định riêng</h2>
                    {([ ["pets", "Thú cưng"], ["smoking", "Hút thuốc"] ] as const).map(([key, title]) => (
                        <label key={key} className="block space-y-1.5 text-sm font-semibold text-ink-3">
                            {title}
                            <select value={policyOverrides.overrides[key] ?? ""} onChange={(event) => setPolicyOverride(key, event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3">
                                <option value="">Theo quy định chung</option>
                                <option value="ALLOWED">Được phép</option>
                                <option value="NOT_ALLOWED">Không cho phép</option>
                                <option value="ASK_OWNER">Trao đổi với chủ nhà</option>
                            </select>
                        </label>
                    ))}
                    <div className="rounded-xl border border-line bg-white p-3">
                        <h3 className="text-sm font-semibold text-ink">Quy định chung của bất động sản</h3>
                        {sharedRules.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{sharedRules.map((rule, index) => <li key={`${rule}-${index}`}>{rule}</li>)}</ul>
                        ) : <p className="mt-2 text-sm text-muted">Chưa có quy định chung.</p>}
                        <p className="mt-2 text-xs text-subtle">Các quy định này được giữ nguyên và áp dụng cho căn/phòng.</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-ink">Quy định bổ sung cho căn/phòng</h3>
                        {policyOverrides.additional_rules.map((rule, index) => (
                            <div key={`${index}-${rule}`} className="flex items-center gap-2">
                                <input value={rule} onChange={(event) => setPolicyOverrides((current) => ({ ...current, additional_rules: current.additional_rules.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} maxLength={240} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3" />
                                <button type="button" aria-label={`Xóa quy định ${rule}`} onClick={() => setPolicyOverrides((current) => ({ ...current, additional_rules: current.additional_rules.filter((_, itemIndex) => itemIndex !== index) }))} className="px-3 text-subtle">×</button>
                            </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                            <input value={newRule} onChange={(event) => setNewRule(event.target.value)} maxLength={240} placeholder="Thêm quy định riêng" className="min-h-11 min-w-48 flex-1 rounded-xl border border-line-strong bg-white px-3" />
                            <button type="button" onClick={addAdditionalRule} disabled={!newRule.trim()} className={buttonClass({ variant: "secondary" })}>Thêm quy định</button>
                        </div>
                    </div>
                </section>

                {message && <p role="alert" className="rounded-xl border border-danger/30 bg-[#fff8f7] p-3 text-sm text-danger-ink">{message}</p>}

                <footer className="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-4">
                    <Link href={`/owner/properties/${propertyId}/units`} className={buttonClass({ variant: "secondary" })}>Hủy</Link>
                    <button type="button" disabled={isPending} onClick={save} className={buttonClass()}>{isPending ? "Đang lưu…" : "Lưu thay đổi"}</button>
                </footer>
            </div>
        </section>
    );
}
