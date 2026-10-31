import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { getMyProperty } from "@/server/properties";
import { UnitManager, type UnitListItem } from "./unit-manager";

export const instant = false;

export default async function PropertyUnitsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const property = await getMyProperty(id);
    if (!property) notFound();

    const units: UnitListItem[] = property.units.map((unit) => ({
        id: unit.id,
        label: unit.label,
        unitKind: unit.unitKind,
        areaM2: unit.areaM2 === null ? null : Number(unit.areaM2),
        advertisedMonthlyRent: unit.advertisedMonthlyRent === null ? null : Number(unit.advertisedMonthlyRent),
        deposit: unit.deposit === null ? null : Number(unit.deposit),
        minimumRentalMonths: unit.minimumRentalMonths,
        maxOccupants: unit.maxOccupants,
        operationalStatus: unit.operationalStatus,
        isMarketed: unit.isMarketed,
    }));
    const listing = property.listings[0] ?? null;
    const returnTo = `/owner/properties/${property.id}/units`;
    const statusLabels: Record<string, string> = {
        READY: "Sẵn sàng",
        MAINTENANCE: "Đang bảo trì",
        RETIRED: "Ngừng khai thác",
    };

    return (
        <section className="mx-auto w-full max-w-6xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <nav aria-label="Đường dẫn" className="mb-2 text-sm text-subtle">
                        <Link href="/owner/properties" className="hover:text-brand">
                            Bất động sản
                        </Link>
                        <span aria-hidden="true"> / </span>
                        <Link href={`/owner/properties/${property.id}`} className="hover:text-brand hover:underline">
                            {property.name}
                        </Link>
                    </nav>
                    <h1 className="text-2xl font-bold tracking-tight text-ink">Căn/phòng của bất động sản</h1>
                    <p className="mt-1 text-sm text-subtle">Tạo nhiều căn cùng lúc, sau đó chỉnh sửa từng căn riêng.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/owner/properties/${property.id}/media`} className={buttonClass({ variant: "secondary" })}>
                        Hình ảnh
                    </Link>
                    <Link
                        href={listing
                            ? `/owner/listings/${listing.id}?returnTo=${encodeURIComponent(returnTo)}`
                            : `/owner/listings/new?propertyId=${property.id}&returnTo=${encodeURIComponent(returnTo)}`}
                        className={buttonClass()}
                    >
                        {listing ? "Quản lý tin đăng" : "Tạo tin đăng"}
                    </Link>
                    <Link href="/owner/properties" className={buttonClass({ variant: "secondary" })}>
                        Danh sách bất động sản
                    </Link>
                </div>
            </header>

            {property.rentalArrangement === "SEPARATE_UNITS" ? (
                <UnitManager propertyId={property.id} initialUnits={units} />
            ) : (
                <section className="rounded-2xl border border-line bg-white p-6">
                    <h2 className="text-lg font-semibold text-ink">Cho thuê toàn bộ không gian</h2>
                    <p className="mt-2 text-sm text-subtle">Bất động sản này chỉ có một căn đại diện. Không thể tạo thêm căn/phòng riêng.</p>
                    {units.map((unit) => (
                        <div key={unit.id} className="mt-4 rounded-xl bg-surface p-4">
                            <p className="font-semibold text-ink">{unit.label}</p>
                            <p className="mt-1 text-sm text-subtle">Trạng thái: {statusLabels[unit.operationalStatus] ?? unit.operationalStatus}</p>
                        </div>
                    ))}
                </section>
            )}
        </section>
    );
}
