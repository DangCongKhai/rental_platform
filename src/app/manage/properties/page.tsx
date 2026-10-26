import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getMyProperties } from "@/server/properties";
import { PropertyActions } from "./property-actions";

export const instant = false;

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh"
});

const propertyTypeLabels: Record<string, string> = {
    HOUSE: "Nhà riêng",
    APARTMENT: "Căn hộ",
    APARTMENT_BUILDING: "Tòa nhà căn hộ"
};

const arrangementLabels: Record<string, string> = {
    WHOLE_SPACE: "Cho thuê nguyên căn",
    SEPARATE_UNITS: "Cho thuê từng phòng/căn"
};

export default async function ManagePropertiesPage() {
    const properties = await getMyProperties();

    return (
        <section className="space-y-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-brand">KHÔNG GIAN CHỦ NHÀ</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Bất động sản của tôi</h1>
                    <p className="mt-2 max-w-2xl text-muted">Quản lý thông tin nhà cho thuê và tiếp tục hoàn thienj bản nháp bất cứ lúc nào.</p>
                </div>

                <Link href="/manage/properties/new" className={buttonClass({size: "lg"})}>+ Thêm bất động sản</Link>
            </header>

            {properties.length === 0 ? (
                <div className="rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-card">
                    <h2 className="text-xl font-semibold text-ink">Bạn chưa có bất động sản nào</h2>
                    <p className="mx-auto mt-2 max-w-lg text-muted">Tạo bản nháp đầu tiên. Bạn có thể lưu khi chưa điền xong và quay lại sau.</p>
                    <Link href="/manage/properties/new" className={`${buttonClass()} mt-6`}>Bắt đầu tạo bản nháp</Link>
                </div>) : (
                    <div className="grid gap-4">
                        {properties.map((property) => {
                            const address = [
                                property.addressLine,
                                property.ward,
                                property.district,
                                property.city
                            ].filter(Boolean)
                            .join(", ");

                        return (
                            <article key={property.id} className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-brand">
                                            {propertyTypeLabels[property.propertyType] ?? property.propertyType}
                                            {" · "}
                                            {arrangementLabels[property.rentalArrangement] ?? property.rentalArrangement}
                                        </p>
                                        <h2 className="mt-1 truncate text-xl font-semibold text-ink">{property.name}</h2>
                                        <p className="mt-2 text-sm text-muted">{address || "Chưa thêm địa chỉ"}</p>
                                    </div>

                                    <Link href={`/manage/properties/${property.id}`} className={buttonClass({
                                        variant: "secondary",
                                        className: "shrink-0"
                                    })}>Tiếp tục chỉnh sửa</Link>
                                    <PropertyActions propertyId={property.id} />
                                </div>

                                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line-soft pt-4 text-sm text-subtle">
                                    <span>{property._count.units} căn/phòng</span>
                                    <span>Bản nháp</span>
                                    <span>Cập nhật {dateFormatter.format(property.updatedAt)}</span>
                                </div>
                            </article>
                        );
                        })}
                    </div>
                )}
        </section>
    )
}
