import { notFound } from "next/navigation";
import { validateAmenities } from "@/domain/amenities";
import { validatePropertyPolicies } from "@/domain/policies";
import { getMyProperty } from "@/server/properties";
import { PropertyWizard, type Draft } from "../new/property-wizard";

export const instant = false;

type PropertyType = NonNullable<Draft["propertyType"]>;
type RentalArrangement = NonNullable<Draft["rentalArrangement"]>;

function asPropertyType(value: string): PropertyType | null {
    if (value === "HOUSE" || value === "APARTMENT" || value === "APARTMENT_BUILDING") {
        return value;
    }
    return null;
}

function asRentalArrangement(value: string): RentalArrangement | null {
    if (value === "WHOLE_SPACE" || value === "SEPARATE_UNITS") {
        return value;
    }
    return null;
}

export default async function EditPropertyPage({params}: {params: Promise<{ id: string }>}) {
    const { id } = await params;
    const property = await getMyProperty(id);

    if (!property) notFound();

    const propertyType = asPropertyType(property.propertyType);
    const rentalArrangement = asRentalArrangement(property.rentalArrangement);
    const amenities = validateAmenities(property.sharedAmenities, "PROPERTY");
    const policies = validatePropertyPolicies(property.policies);

    if (!propertyType || !rentalArrangement || !amenities.success || !policies.success) {
        throw new Error("Saved property data is invalid.");
    }

    const draft: Draft = {
        name: property.name,
        propertyType,
        rentalArrangement,
        addressLine: property.addressLine ?? "",
        ward: property.ward ?? "",
        district: property.district ?? "",
        city: property.city ?? "",
        sharedAmenities: amenities.data,
        policies: policies.data,
    };

    return (
        <PropertyWizard
            initial={{
                propertyId: property.id,
                revision: property.contentRevision,
                draft,
            }}
        />
    );
}
