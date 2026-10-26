"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AMENITY_CATALOG, searchAmenityCatalog, type AmenityKey, type Amenities } from "@/domain/amenities";
import { createProperty, updateProperty } from "../actions";
import { buttonClass } from "@/components/ui/button";

export type PropertyType = "HOUSE" | "APARTMENT" | "APARTMENT_BUILDING";
export type RentalArrangement = "WHOLE_SPACE" | "SEPARATE_UNITS";
export type PolicyValue = "ALLOWED" | "NOT_ALLOWED" | "ASK_OWNER";

export type Draft = {
    name: string;
    propertyType: PropertyType | "";
    rentalArrangement: RentalArrangement | "";
    addressLine: string;
    ward: string;
    district: string;
    city: string;
    sharedAmenities: Amenities;
    policies: {
        schema_version: 1;
        defaults: {
            pets: PolicyValue;
            smoking: PolicyValue;
        };
        shared_rules: string[];
    };
};

const INITIAL_DRAFT: Draft = {
    name: "",
    propertyType: "",
    rentalArrangement: "",
    addressLine: "",
    ward: "",
    district: "",
    city: "",
    sharedAmenities: {
        schema_version: 1,
        standard: {},
        custom: [],
    },
    policies: {
        schema_version: 1,
        defaults: {
            pets: "ASK_OWNER",
            smoking: "NOT_ALLOWED",
        },
        shared_rules: [],
    },
};

const STEPS = ["Loại hình", "Địa chỉ", "Tiện ích chung", "Nội quy", "Xem lại"];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
    HOUSE: "Nhà riêng",
    APARTMENT: "Căn hộ",
    APARTMENT_BUILDING: "Tòa nhà căn hộ",
};

const ARRANGEMENT_LABELS: Record<RentalArrangement, string> = {
    WHOLE_SPACE: "Cho thuê toàn bộ",
    SEPARATE_UNITS: "Cho thuê từng phòng/căn",
};

type PropertyWizardProps = {
    initial?: {
        propertyId: string;
        revision: number;
        draft: Draft
    };
};

export function PropertyWizard({ initial }: PropertyWizardProps) {
    const [draft, setDraft] = useState<Draft>(initial?.draft ?? INITIAL_DRAFT);
    const [step, setStep] = useState(0);
    const [propertyId, setPropertyId] = useState<string | null>(initial?.propertyId ?? null);
    const [revision, setRevision] = useState(initial?.revision ?? 1);
    const [amenitySearch, setAmenitySearch] = useState("");
    const [newAmenity, setNewAmenity] = useState("");
    const [newRule, setNewRule] = useState("");
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();

    const amenitySuggestions = searchAmenityCatalog(amenitySearch, "PROPERTY");

    function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
        setSaved(false);
    }

    function toggleAmenity(key: AmenityKey) {
        setDraft((current) => {
            const standard = { ...current.sharedAmenities.standard };

            if (standard[key]?.enabled) {
                delete standard[key];
            } else {
                standard[key] = { enabled: true };
            }

            return {
                ...current,
                sharedAmenities: { ...current.sharedAmenities, standard },
            };
        });
        setSaved(false);
    }

    function addCustomAmenity() {
        const text = newAmenity.normalize("NFC").trim().replace(/\s+/gu, " ");
        if (!text) return;

        setDraft((current) => ({
            ...current,
            sharedAmenities: {
                ...current.sharedAmenities,
                custom: [...current.sharedAmenities.custom, text],
            },
        }));
        setNewAmenity("");
        setAmenitySearch("");
        setSaved(false);
    }

    function removeCustomAmenity(index: number) {
        setDraft((current) => ({
            ...current,
            sharedAmenities: {
                ...current.sharedAmenities,
                custom: current.sharedAmenities.custom.filter((_, itemIndex) => itemIndex !== index),
            },
        }));
        setSaved(false);
    }

    function addRule() {
        const text = newRule.normalize("NFC").trim().replace(/\s+/gu, " ");
        if (!text) return;

        setDraft((current) => ({
            ...current,
            policies: {
                ...current.policies,
                shared_rules: [...current.policies.shared_rules, text],
            },
        }));
        setNewRule("");
        setSaved(false);
    }

    function saveDraft() {
        setError("");

        if (!draft.name.trim() || !draft.propertyType || !draft.rentalArrangement) {
            setError("Hãy nhập tên và chọn loại hình trước khi lưu bản nháp.");
            setStep(0);
            return;
        }

        startTransition(async () => {
            try {
                const result = propertyId
                    ? await updateProperty(propertyId, {
                            ...draft,
                            expectedRevision: revision,
                    })
                    : await createProperty(draft);

                if (!result.ok) {
                    setError(result.error);
                    return;
                }

                if (!result.data) {
                    setError("Không nhận được kết quả lưu. Hãy thử lại.");
                    return;
                }

                if ("id" in result.data) {
                    if (typeof result.data.id !== "string") {
                        setError("Không nhận được mã bản nháp. Hãy thử lại.");
                        return;
                    }

                    setPropertyId(result.data.id);
                }

                setRevision(result.data.contentRevision);
                setSaved(true);
            } catch {
                setError("Không thể lưu bản nháp. Vui lòng thử lại.");
            }
        });
    }

    return (
        <section className="mx-auto max-w-3xl space-y-7">
            <header>
                <Link href="/manage/properties" className="text-sm font-semibold text-brand hover:text-brand-deep">
                    ← Danh sách bất động sản
                </Link>
                <p className="mt-5 text-sm font-semibold text-brand">TẠO BẢN NHÁP</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Thêm bất động sản</h1>
                <p className="mt-2 text-muted">Lưu bản nháp ở bất kỳ bước nào và tiếp tục hoàn thiện sau.</p>
            </header>

            <ol aria-label="Các bước tạo bất động sản" className="grid grid-cols-5 gap-2">
                {STEPS.map((label, index) => (
                    <li key={label}>
                        <button
                            type="button"
                            aria-current={step === index ? "step" : undefined}
                            onClick={() => setStep(index)}
                            className={`min-h-11 w-full rounded-xl px-2 py-2 text-xs font-semibold sm:text-sm ${
                                step === index ? "bg-brand text-white" : "bg-white text-subtle hover:bg-brand-soft"
                            }`}
                        >
                            <span className="block">{index + 1}</span>
                            <span className="hidden sm:block">{label}</span>
                        </button>
                    </li>
                ))}
            </ol>

            <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
                {step === 0 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-semibold">Loại hình và cách cho thuê</h2>

                        <label className="block space-y-2 text-sm font-medium">
                            Tên bất động sản
                            <input
                                value={draft.name}
                                onChange={(event) => updateDraft("name", event.target.value)}
                                maxLength={120}
                                required
                                className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                                placeholder="Ví dụ: Căn hộ gần biển Mỹ Khê"
                            />
                        </label>

                        <label className="block space-y-2 text-sm font-medium">
                            Loại bất động sản
                            <select
                                value={draft.propertyType}
                                onChange={(event) => updateDraft("propertyType", event.target.value as Draft["propertyType"])}
                                required
                                className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                            >
                                <option value="">Chọn loại bất động sản</option>
                                <option value="HOUSE">Nhà riêng</option>
                                <option value="APARTMENT">Căn hộ</option>
                                <option value="APARTMENT_BUILDING">Tòa nhà căn hộ</option>
                            </select>
                        </label>

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">Cách cho thuê</legend>
                            {(["WHOLE_SPACE", "SEPARATE_UNITS"] as const).map((arrangement) => (
                                <label key={arrangement} className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3">
                                    <input
                                        type="radio"
                                        name="rentalArrangement"
                                        checked={draft.rentalArrangement === arrangement}
                                        onChange={() => updateDraft("rentalArrangement", arrangement)}
                                    />
                                    {ARRANGEMENT_LABELS[arrangement]}
                                </label>
                            ))}
                        </fieldset>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-semibold">Địa chỉ</h2>
                        {(
                            [
                                ["addressLine", "Địa chỉ cụ thể"],
                                ["ward", "Phường / xã"],
                                ["district", "Quận / huyện"],
                                ["city", "Tỉnh / thành phố"],
                            ] as const
                        ).map(([field, label]) => (
                            <label key={field} className="block space-y-2 text-sm font-medium">
                                {label}
                                <input
                                    value={draft[field]}
                                    onChange={(event) => updateDraft(field, event.target.value)}
                                    maxLength={240}
                                    className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                                />
                            </label>
                        ))}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-semibold">Tiện ích chung</h2>
                        <p className="text-sm text-muted">Chọn tiện ích dùng chung cho bất động sản. Tiện ích riêng từng căn có thể được thêm sau.</p>

                        <label className="block space-y-2 text-sm font-medium">
                            Tìm tiện ích
                            <input
                                value={amenitySearch}
                                onChange={(event) => setAmenitySearch(event.target.value)}
                                className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                                placeholder="Ví dụ: elevator"
                            />
                        </label>

                        {amenitySuggestions.length > 0 && (
                            <ul className="space-y-2">
                                {amenitySuggestions.map((amenity) => (
                                    <li key={amenity.key}>
                                        <button
                                            type="button"
                                            onClick={() => toggleAmenity(amenity.key)}
                                            className="min-h-11 w-full rounded-xl border border-line px-3 text-left hover:bg-brand-soft"
                                        >
                                            {draft.sharedAmenities.standard[amenity.key]?.enabled ? "✓ " : ""}
                                            {amenity.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="space-y-2">
                            <label className="block space-y-2 text-sm font-medium">
                                Tiện ích khác
                                <input
                                    value={newAmenity}
                                    onChange={(event) => setNewAmenity(event.target.value)}
                                    maxLength={80}
                                    className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                                    placeholder="Nhập tiện ích chưa có trong danh sách"
                                />
                            </label>
                            <button type="button" onClick={addCustomAmenity} className={buttonClass({ variant: "secondary" })}>
                                Thêm tiện ích khác
                            </button>
                        </div>

                        {draft.sharedAmenities.custom.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {draft.sharedAmenities.custom.map((item, index) => (
                                    <li key={`${item}-${index}`} className="flex items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-sm">
                                        {item}
                                        <button type="button" aria-label={`Xóa tiện ích ${item}`} onClick={() => removeCustomAmenity(index)}>
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-semibold">Nội quy</h2>

                        {(
                            [
                                ["pets", "Thú cưng"],
                                ["smoking", "Hút thuốc"],
                            ] as const
                        ).map(([key, label]) => (
                            <label key={key} className="block space-y-2 text-sm font-medium">
                                {label}
                                <select
                                    value={draft.policies.defaults[key]}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            policies: {
                                                ...current.policies,
                                                defaults: {
                                                    ...current.policies.defaults,
                                                    [key]: event.target.value as PolicyValue,
                                                },
                                            },
                                        }))
                                    }
                                    className="min-h-11 w-full rounded-xl border border-line-strong px-3"
                                >
                                    <option value="ASK_OWNER">Trao đổi với chủ nhà</option>
                                    <option value="ALLOWED">Được phép</option>
                                    <option value="NOT_ALLOWED">Không cho phép</option>
                                </select>
                            </label>
                        ))}

                        <label className="block space-y-2 text-sm font-medium">
                            Quy định chung
                            <textarea
                                value={newRule}
                                onChange={(event) => setNewRule(event.target.value)}
                                maxLength={240}
                                rows={3}
                                className="w-full rounded-xl border border-line-strong p-3"
                                placeholder="Ví dụ: Giữ yên tĩnh sau 22:00"
                            />
                        </label>
                        <button type="button" onClick={addRule} className={buttonClass({ variant: "secondary" })}>
                            Thêm quy định
                        </button>

                        {draft.policies.shared_rules.length > 0 && (
                            <ul className="space-y-2">
                                {draft.policies.shared_rules.map((rule, index) => (
                                    <li key={`${rule}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-brand-soft px-3 py-2">
                                        <span>{rule}</span>
                                        <button
                                            type="button"
                                            aria-label={`Xóa quy định ${rule}`}
                                            onClick={() =>
                                                setDraft((current) => ({
                                                    ...current,
                                                    policies: {
                                                        ...current.policies,
                                                        shared_rules: current.policies.shared_rules.filter((_, ruleIndex) => ruleIndex !== index),
                                                    },
                                                }))
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Kiểm tra thông tin</h2>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <ReviewItem label="Tên" value={draft.name || "Chưa nhập"} />
                            <ReviewItem label="Loại" value={draft.propertyType ? PROPERTY_TYPE_LABELS[draft.propertyType] : "Chưa chọn"} />
                            <ReviewItem label="Cách cho thuê" value={draft.rentalArrangement ? ARRANGEMENT_LABELS[draft.rentalArrangement] : "Chưa chọn"} />
                            <ReviewItem
                                label="Địa chỉ"
                                value={[draft.addressLine, draft.ward, draft.district, draft.city].filter(Boolean).join(", ") || "Chưa thêm"}
                            />
                            <ReviewItem
                                label="Tiện ích chung"
                                value={
                                    [
                                        ...Object.keys(draft.sharedAmenities.standard).filter((key) => draft.sharedAmenities.standard[key]?.enabled),
                                        ...draft.sharedAmenities.custom,
                                    ].join(", ") || "Chưa thêm"
                                }
                            />
                            <ReviewItem label="Nội quy chung" value={draft.policies.shared_rules.join("; ") || "Chưa thêm"} />
                        </dl>
                        <p className="text-sm text-muted">
                            Lưu sẽ tạo hoặc cập nhật bản nháp. Việc này chưa gửi bất động sản đi kiểm duyệt hoặc đăng công khai.
                        </p>
                    </div>
                )}

                {error && (
                    <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-danger">
                        {error}
                    </p>
                )}

                {saved && (
                    <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-success">
                        Bản nháp đã được lưu.
                    </p>
                )}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5">
                    <button
                        type="button"
                        disabled={step === 0 || pending}
                        onClick={() => setStep((current) => Math.max(0, current - 1))}
                        className={buttonClass({ variant: "secondary" })}
                    >
                        Quay lại
                    </button>

                    <div className="flex flex-wrap gap-3">
                        <button type="button" disabled={pending} onClick={saveDraft} className={buttonClass({ variant: "secondary" })}>
                            {pending ? "Đang lưu…" : "Lưu bản nháp"}
                        </button>

                        {step < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    if (step === 0 && (!draft.name.trim() || !draft.propertyType || !draft.rentalArrangement)) {
                                        setError("Hãy nhập tên và chọn loại hình trước khi tiếp tục.");
                                        return;
                                    }
                                    setStep((current) => Math.min(STEPS.length - 1, current + 1));
                                }}
                                className={buttonClass()}
                            >
                                Tiếp tục
                            </button>
                        ) : (
                            <button type="button" disabled={pending} onClick={saveDraft} className={buttonClass()}>
                                {pending ? "Đang lưu…" : "Lưu hoàn tất"}
                            </button>
                        )}
                    </div>
                </div>

                {propertyId && (
                    <p className="text-sm text-subtle">
                        Mã bản nháp: {propertyId} · Phiên bản nội dung: {revision}
                    </p>
                )}

                <p className="sr-only">Danh mục có {AMENITY_CATALOG.length} tiện ích chuẩn.</p>
            </div>
        </section>
    );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-canvas p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</dt>
            <dd className="mt-1 break-words text-sm text-ink">{value}</dd>
        </div>
    );
}
