"use client";

import { useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AMENITY_CATALOG, getAmenityCatalog, type AmenityKey, type Amenities } from "@/domain/amenities";
import { createProperty, updateProperty } from "../actions";
import { buttonClass } from "@/components/ui/button";

export type PropertyType = "HOUSE" | "APARTMENT" | "APARTMENT_BUILDING";
export type RentalArrangement = "WHOLE_SPACE" | "SEPARATE_UNITS";
export type PolicyValue = "ALLOWED" | "NOT_ALLOWED" | "ASK_OWNER";

export type Draft = {
    name: string;
    description: string;
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
    description: "",
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

const STEPS = [
    "Thông tin cơ bản",
    "Hình thức thuê",
    "Tiện ích chung",
    "Quy định và nội quy",
    "Kiểm tra lại",
];

const STEP_CONTENT = [
    {
        title: "Thông tin cơ bản về bất động sản",
        description: "Cung cấp tên, loại hình, mô tả và địa chỉ của bất động sản.",
    },
    {
        title: "Hình thức thuê",
        description: "Chọn cho thuê nguyên căn hay từng phòng/căn riêng biệt.",
    },
    {
        title: "Tiện ích chung",
        description: "Chọn tiện ích có sẵn tại bất động sản và các khu vực dùng chung.",
    },
    {
        title: "Quy định và nội quy",
        description: "Cho người thuê biết các quy định về thú cưng, hút thuốc và sinh hoạt.",
    },
    {
        title: "Kiểm tra lại thông tin",
        description: "Xem lại thông tin trước khi lưu bản nháp.",
    },
];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
    HOUSE: "Nhà riêng",
    APARTMENT: "Căn hộ",
    APARTMENT_BUILDING: "Tòa nhà căn hộ",
};

const ARRANGEMENT_LABELS: Record<RentalArrangement, string> = {
    WHOLE_SPACE: "Cho thuê toàn bộ",
    SEPARATE_UNITS: "Cho thuê từng phòng/căn",
};

const ARRANGEMENT_DESCRIPTIONS: Record<RentalArrangement, string> = {
    WHOLE_SPACE: "Cho thuê nguyên căn hoặc toàn bộ căn hộ cho một hộ thuê.",
    SEPARATE_UNITS: "Cho thuê từng phòng hoặc căn độc lập trong cùng bất động sản.",
};

type PropertyWizardProps = {
    initial?: {
        propertyId: string;
        revision: number;
        draft: Draft
    };
};

export function PropertyWizard({ initial }: PropertyWizardProps) {
    const rentalArrangementGroupName = useId();
    const [draft, setDraft] = useState<Draft>(initial?.draft ?? INITIAL_DRAFT);
    const [step, setStep] = useState(0);
    const [propertyId, setPropertyId] = useState<string | null>(initial?.propertyId ?? null);
    const [revision, setRevision] = useState(initial?.revision ?? 1);
    const [newAmenity, setNewAmenity] = useState("");
    const [newRule, setNewRule] = useState("");
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();
    const resetNewDraftOnHide = useRef(false);

    useLayoutEffect(() => {
        return () => {
            if (!initial && resetNewDraftOnHide.current) {
                resetNewDraftOnHide.current = false;
                setDraft(INITIAL_DRAFT);
                setStep(0);
                setPropertyId(null);
                setRevision(1);
                setNewAmenity("");
                setNewRule("");
                setError("");
                setSaved(false);
            }
        };
    }, [initial]);

    const amenityOptions = getAmenityCatalog("PROPERTY");
    const selectedAmenityCount =
        Object.values(draft.sharedAmenities.standard).filter((amenity) => amenity.enabled).length +
        draft.sharedAmenities.custom.length;

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

        if (!draft.name.trim() || !draft.propertyType) {
            setError("Hãy nhập tên và chọn loại hình trước khi lưu bản nháp.");
            setStep(0);
            return;
        }
        if (!draft.rentalArrangement) {
            setError("Hãy chọn hình thức thuê trước khi lưu bản nháp.");
            setStep(1);
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
                    if (!initial) resetNewDraftOnHide.current = true;
                }

                setRevision(result.data.contentRevision);
                setSaved(true);
            } catch {
                setError("Không thể lưu bản nháp. Vui lòng thử lại.");
            }
        });
    }

    return (
        <section className="space-y-5">
            <header className="space-y-3">
                <p className="text-xs text-subtle">Không gian quản lý / Chủ nhà / Bất động sản / Tạo bất động sản</p>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">Tạo bản nháp</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Thêm bất động sản mới</h1>
                    <p className="mt-1 text-sm text-muted">Cung cấp thông tin cơ bản, hình thức cho thuê và tiện ích để bắt đầu tìm người thuê.</p>
                </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
                <aside className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-ink">Các bước đăng ký</h2>
                        <span className="text-xs text-subtle">Bước {step + 1} / {STEPS.length}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                    </div>
                    <ol aria-label="Các bước tạo bất động sản" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        {STEPS.map((label, index) => (
                            <li key={label}>
                                <button
                                    type="button"
                                    aria-current={step === index ? "step" : undefined}
                                    onClick={() => setStep(index)}
                                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm ${
                                        step === index
                                            ? "border-brand bg-brand-soft text-brand-deep"
                                            : "border-line bg-white text-subtle hover:border-line-brand hover:bg-brand-soft/60"
                                    }`}
                                >
                                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        step === index ? "bg-brand text-white" : index < step ? "bg-success-soft text-success" : "bg-canvas text-subtle"
                                    }`}>
                                        {index < step ? "✓" : index + 1}
                                    </span>
                                    <span>{label}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                    <p className="hidden text-xs leading-5 text-subtle lg:block">
                        Bạn có thể lưu bản nháp và tiếp tục hoàn thiện bất cứ lúc nào.
                    </p>
                </aside>

                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <header className="border-b border-line-soft px-5 py-4 sm:px-6">
                        <h2 className="text-lg font-bold text-ink sm:text-xl">{STEP_CONTENT[step].title}</h2>
                        <p className="mt-1 text-xs text-muted sm:text-sm">{STEP_CONTENT[step].description}</p>
                    </header>
                    <div className="m-4 space-y-5 rounded-xl bg-canvas p-4 sm:m-5 sm:p-5">
                {step === 0 && (
                    <div className="space-y-5">
                        <label className="block space-y-2 text-sm font-medium">
                            Tên bất động sản
                            <input
                                value={draft.name}
                                onChange={(event) => updateDraft("name", event.target.value)}
                                maxLength={120}
                                required
                                className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm"
                                placeholder="Ví dụ: Căn hộ gần biển Mỹ Khê"
                            />
                        </label>

                        <label className="block space-y-2 text-sm font-medium">
                            Loại bất động sản
                            <select
                                value={draft.propertyType}
                                onChange={(event) => updateDraft("propertyType", event.target.value as Draft["propertyType"])}
                                required
                                className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm"
                            >
                                <option value="">Chọn loại bất động sản</option>
                                <option value="HOUSE">Nhà riêng</option>
                                <option value="APARTMENT">Căn hộ</option>
                                <option value="APARTMENT_BUILDING">Tòa nhà căn hộ</option>
                            </select>
                        </label>

                        <label className="block space-y-2 text-sm font-medium">
                            Mô tả chi tiết
                            <textarea
                                value={draft.description}
                                onChange={(event) => updateDraft("description", event.target.value)}
                                maxLength={2000}
                                rows={3}
                                className="w-full rounded-lg border border-line-strong bg-white p-3 text-sm"
                                placeholder="Mô tả ngắn gọn về bất động sản và điểm nổi bật."
                            />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    ["city", "Thành phố"],
                                    ["district", "Quận / huyện"],
                                    ["ward", "Phường / xã"],
                                    ["addressLine", "Địa chỉ cụ thể"],
                                ] as const
                            ).map(([field, label]) => (
                                <label key={field} className="block space-y-2 text-sm font-medium">
                                    {label}
                                    <input
                                        value={draft[field]}
                                        onChange={(event) => updateDraft(field, event.target.value)}
                                        maxLength={240}
                                        className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-5">
                        <fieldset className="space-y-2">
                            <legend className="mb-2 text-sm font-medium">Hình thức cho thuê của bất động sản</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {(["WHOLE_SPACE", "SEPARATE_UNITS"] as const).map((arrangement) => (
                                    <label
                                        key={arrangement}
                                        className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 text-sm transition-colors ${
                                            draft.rentalArrangement === arrangement ? "border-brand ring-1 ring-brand/30" : "border-line hover:border-line-brand"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={rentalArrangementGroupName}
                                            value={arrangement}
                                            checked={draft.rentalArrangement === arrangement}
                                            onChange={() => updateDraft("rentalArrangement", arrangement)}
                                            className="mt-0.5 size-4 shrink-0 accent-brand"
                                        />
                                        <span>
                                            <span className="block font-semibold text-ink">{ARRANGEMENT_LABELS[arrangement]}</span>
                                            <span className="mt-1 block text-xs leading-5 text-muted">{ARRANGEMENT_DESCRIPTIONS[arrangement]}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {draft.rentalArrangement === "WHOLE_SPACE" && (
                            <p className="rounded-lg border border-line bg-white p-3 text-xs leading-5 text-muted">
                                Hệ thống sẽ tạo một căn/phòng đại diện cho toàn bộ bất động sản.
                            </p>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold text-ink">Tiện ích có sẵn</h3>
                                <p className="mt-1 text-xs text-muted">Chọn một hoặc nhiều tiện ích dùng chung cho bất động sản.</p>
                            </div>
                            <p className="text-xs font-medium text-subtle">Đã chọn {selectedAmenityCount}</p>
                        </div>

                        {amenityOptions.length > 0 ? (
                            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {amenityOptions.map((amenity) => {
                                    const selected = draft.sharedAmenities.standard[amenity.key]?.enabled === true;
                                    return (
                                    <li key={amenity.key}>
                                        <button
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => toggleAmenity(amenity.key)}
                                            className={`flex min-h-12 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                                selected
                                                    ? "border-brand bg-brand-soft font-semibold text-brand-deep ring-1 ring-brand/20"
                                                    : "border-line bg-white text-ink hover:border-line-brand hover:bg-brand-soft/50"
                                            }`}
                                        >
                                            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                                                selected ? "border-brand bg-brand text-white" : "border-line-strong text-subtle"
                                            }`} aria-hidden="true">{selected ? "✓" : "+"}</span>
                                            <span>{amenity.label}</span>
                                        </button>
                                    </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-lg border border-dashed border-line-strong bg-white p-4 text-sm text-muted">
                                Không tìm thấy tiện ích phù hợp. Bạn có thể thêm tiện ích riêng bên dưới.
                            </p>
                        )}

                        <div className="space-y-3 border-t border-line-soft pt-4">
                            <label className="block space-y-2 text-sm font-medium">
                                Tiện ích khác
                                <input
                                    value={newAmenity}
                                    onChange={(event) => setNewAmenity(event.target.value)}
                                    maxLength={80}
                                    className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm"
                                    placeholder="Nhập tiện ích chưa có trong danh sách"
                                />
                            </label>
                            <button type="button" disabled={!newAmenity.trim()} onClick={addCustomAmenity} className={buttonClass({ variant: "secondary" })}>
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
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <ReviewItem label="Tên" value={draft.name || "Chưa nhập"} />
                            <ReviewItem label="Loại" value={draft.propertyType ? PROPERTY_TYPE_LABELS[draft.propertyType] : "Chưa chọn"} />
                            <ReviewItem label="Cách cho thuê" value={draft.rentalArrangement ? ARRANGEMENT_LABELS[draft.rentalArrangement] : "Chưa chọn"} />
                            <ReviewItem label="Mô tả" value={draft.description || "Chưa thêm"} />
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
                    </div>

                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-4 sm:px-6">
                        {step === 0 ? (
                            <Link href="/owner/properties" className={buttonClass({ variant: "secondary" })}>
                                Hủy
                            </Link>
                        ) : (
                            <button
                                type="button"
                                disabled={pending}
                                onClick={() => setStep((current) => Math.max(0, current - 1))}
                                className={buttonClass({ variant: "secondary" })}
                            >
                                Quay lại
                            </button>
                        )}

                        <div className="flex flex-wrap gap-3">
                            {step < STEPS.length - 1 && (
                                <button type="button" disabled={pending} onClick={saveDraft} className={buttonClass({ variant: "secondary" })}>
                                    {pending ? "Đang lưu…" : "Lưu bản nháp"}
                                </button>
                            )}

                            {step < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError("");
                                        if (step === 0 && (!draft.name.trim() || !draft.propertyType)) {
                                            setError("Hãy nhập tên và chọn loại hình trước khi tiếp tục.");
                                            return;
                                        }
                                        if (step === 1 && !draft.rentalArrangement) {
                                            setError("Hãy chọn hình thức thuê trước khi tiếp tục.");
                                            return;
                                        }
                                        setStep((current) => Math.min(STEPS.length - 1, current + 1));
                                    }}
                                    className={buttonClass()}
                                >
                                    Bước tiếp theo <span aria-hidden="true">→</span>
                                </button>
                            ) : (
                                <button type="button" disabled={pending} onClick={saveDraft} className={buttonClass()}>
                                    {pending ? "Đang lưu…" : "Lưu bản nháp"}
                                </button>
                            )}
                        </div>
                    </footer>

                    {propertyId && (
                        <p className="px-5 pb-4 text-xs text-subtle sm:px-6">
                            Mã bản nháp: {propertyId} · Phiên bản nội dung: {revision}
                        </p>
                    )}

                    <p className="sr-only">Danh mục có {AMENITY_CATALOG.length} tiện ích chuẩn.</p>
                </div>
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
