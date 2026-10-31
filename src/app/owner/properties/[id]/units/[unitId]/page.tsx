import { notFound } from "next/navigation";
import { getMyProperty } from "@/server/properties";
import { validateAmenities } from "@/domain/amenities";
import { validatePropertyPolicies, validateUnitPolicyOverrides } from "@/domain/policies";
import { getPropertyMedia } from "@/server/property-media";
import { UnitEditor } from "./unit-editor";

export const instant = false;

export default async function EditUnitPage({
    params,
}: {
    params: Promise<{ id: string; unitId: string }>;
}) {
    const { id, unitId } = await params;
    const property = await getMyProperty(id);
    if (!property) notFound();

    const unit = property.units.find((item) => item.id === unitId);
    if (!unit) notFound();
    const propertyMedia = await getPropertyMedia(property.id);
    const unitPhotos = propertyMedia
        .filter((item) => item.unitId === unit.id || (item.unitId === null && item.assignedUnitIds.includes(unit.id)))
        .map((item) => ({
            id: item.id,
            caption: item.caption,
            signedUrl: item.signedUrl,
            source: item.unitId === null ? "Bất động sản" : "Ảnh riêng",
        }));

    const amenities = validateAmenities(unit.amenities, "UNIT");
    const unitPolicies = validateUnitPolicyOverrides(unit.policyOverrides);
    const propertyPolicies = validatePropertyPolicies(property.policies);
    if (!amenities.success || !unitPolicies.success || !propertyPolicies.success) {
        throw new Error("Dữ liệu tiện ích hoặc quy định của căn/phòng không hợp lệ.");
    }

    return (
        <UnitEditor
            propertyId={property.id}
            propertyName={property.name}
            photos={unitPhotos}
            sharedRules={propertyPolicies.data.shared_rules}
            unit={{
                id: unit.id,
                label: unit.label,
                unitKind: unit.unitKind,
                description: unit.description,
                floor: unit.floor,
                areaM2: unit.areaM2 === null ? null : Number(unit.areaM2),
                bedrooms: unit.bedrooms,
                bathrooms: Number(unit.bathrooms),
                bathroomArrangement: unit.bathroomArrangement,
                advertisedMonthlyRent:
                    unit.advertisedMonthlyRent === null ? null : Number(unit.advertisedMonthlyRent),
                deposit: unit.deposit === null ? null : Number(unit.deposit),
                minimumRentalMonths: unit.minimumRentalMonths,
                maxOccupants: unit.maxOccupants,
                operationalStatus: unit.operationalStatus,
                isMarketed: unit.isMarketed,
                amenities: amenities.data,
                policyOverrides: unitPolicies.data,
            }}
        />
    );
}
