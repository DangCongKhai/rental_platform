export const MAX_BULK_UNIT_COUNT = 50;

export type UnitPreviewDefaults = {
    unitKind: string;
    areaM2: number | null;
    advertisedMonthlyRent: number;
    deposit: number;
    maxOccupants: number | null;
    minimumRentalMonths: number
};

export type UnitPreviewConfig = UnitPreviewDefaults & {
    count: number;
    prefix: string;
    startNumber: number;
};

export type UnitPreviewRow = UnitPreviewDefaults & {
    rowId: string;
    label: string;
};

export function normalizeUnitLabel(label: string): string {
    return label
        .normalize("NFC")
        .trim()
        .replace(/\s+/gu, " ")
        .toLocaleLowerCase("vi");
};

export function generateUnitPreview(config: UnitPreviewConfig): UnitPreviewRow[] {
    const prefix = config.prefix.normalize("NFC").trim();

    if (!Number.isInteger(config.count) || config.count < 1 || config.count > MAX_BULK_UNIT_COUNT) {
        throw new RangeError(`Count must be between 1 and ${MAX_BULK_UNIT_COUNT}`);
    }

    if (!prefix) {
        throw new Error("Prefix is required.");
    }

    if (!Number.isInteger(config.startNumber) || config.startNumber < 1) {
        throw new RangeError("Start number must be a positive integer.");
    }

    return Array.from({ length: config.count }, (_, index) => ({
        rowId: `preview-${index}`,
        label: `${prefix}${config.startNumber + index}`,
        unitKind: config.unitKind,
        areaM2: config.areaM2,
        advertisedMonthlyRent: config.advertisedMonthlyRent,
        deposit: config.deposit,
        maxOccupants: config.maxOccupants,
        minimumRentalMonths: config.minimumRentalMonths,
    }));
}