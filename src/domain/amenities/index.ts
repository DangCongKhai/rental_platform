import { z } from "zod";

export type AmenityScope = "PROPERTY" | "UNIT";

type AmenityDefinition = {
  key: string;
  label: string;
  aliases: readonly string[];
  scopes: readonly AmenityScope[];
};

export const AMENITY_CATALOG = [
  {
    key: "wifi",
    label: "Wi-Fi",
    aliases: ["wi-fi", "wireless", "internet"],
    scopes: ["PROPERTY", "UNIT"],
  },
  {
    key: "elevator",
    label: "Thang máy",
    aliases: ["lift"],
    scopes: ["PROPERTY"],
  },
  {
    key: "air_conditioning",
    label: "Điều hòa",
    aliases: ["aircon", "air con", "ac", "máy lạnh"],
    scopes: ["UNIT"],
  },
  {
    key: "parking",
    label: "Chỗ đỗ xe",
    aliases: ["motorbike parking", "car parking"],
    scopes: ["PROPERTY"],
  },
  {
    key: "pool",
    label: "Hồ bơi",
    aliases: ["swimming pool"],
    scopes: ["PROPERTY"],
  },
  {
    key: "gym",
    label: "Phòng tập",
    aliases: ["fitness room"],
    scopes: ["PROPERTY"],
  },
  {
    key: "shared_laundry",
    label: "Khu giặt chung",
    aliases: ["shared washing area"],
    scopes: ["PROPERTY"],
  },
  {
    key: "security",
    label: "An ninh",
    aliases: ["security cameras", "guard"],
    scopes: ["PROPERTY"],
  },
  {
    key: "balcony",
    label: "Ban công",
    aliases: ["terrace"],
    scopes: ["UNIT"],
  },
  {
    key: "kitchen",
    label: "Nhà bếp",
    aliases: ["cooking area"],
    scopes: ["UNIT"],
  },
  {
    key: "washing_machine",
    label: "Máy giặt riêng",
    aliases: ["washer"],
    scopes: ["UNIT"],
  },
  {
    key: "refrigerator",
    label: "Tủ lạnh",
    aliases: ["fridge"],
    scopes: ["UNIT"],
  },
  {
    key: "water_heater",
    label: "Bình nước nóng",
    aliases: ["hot water"],
    scopes: ["UNIT"],
  },
  {
    key: "furnished",
    label: "Có nội thất",
    aliases: ["furniture"],
    scopes: ["UNIT"],
  },
] as const satisfies readonly AmenityDefinition[];

export type AmenityKey = (typeof AMENITY_CATALOG)[number]["key"];

const catalogByKey = new Map<string, AmenityDefinition>(
  AMENITY_CATALOG.map((amenity) => [amenity.key, amenity]),
);

function supportsScope(
  scopes: readonly AmenityScope[],
  scope: AmenityScope,
): boolean {
  return scopes.some((allowedScope) => allowedScope === scope);
}

const MAX_CUSTOM_ITEMS = 30;
const MAX_CUSTOM_LENGTH = 80;
const MAX_DETAILS_LENGTH = 160;

export type Amenities = {
  schema_version: 1;
  standard: Record<string, { enabled: boolean; details?: string }>;
  custom: string[];
};

export function normalizeAmenityText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

function duplicateKey(value: string): string {
  return normalizeAmenityText(value).toLocaleLowerCase("vi");
}

type AmenityCatalogEntry = (typeof AMENITY_CATALOG)[number];
export function searchAmenityCatalog(
  query: string,
  scope: AmenityScope,
): Array<AmenityCatalogEntry> {
  const needle = normalizeAmenityText(query).toLocaleLowerCase("vi");
  if (!needle) return [];

  return AMENITY_CATALOG.filter((amenity) => {
    if (!supportsScope(amenity.scopes, scope)) return false;

    return [amenity.key, amenity.label, ...amenity.aliases].some((value) =>
      value.toLocaleLowerCase("vi").includes(needle),
    );
  });
}

export function getAmenityCatalog(scope?: AmenityScope) {
  return scope
    ? AMENITY_CATALOG.filter((amenity) => supportsScope(amenity.scopes, scope))
    : AMENITY_CATALOG;
}

const amenityEntrySchema = z
  .object({
    enabled: z.boolean(),
    details: z.string().trim().min(1).max(MAX_DETAILS_LENGTH).optional(),
  })
  .strict();

function makeAmenitiesSchema(scope: AmenityScope) {
  return z
    .object({
      schema_version: z.literal(1),
      standard: z.record(z.string(), amenityEntrySchema),
      custom: z
        .array(
          z
            .string()
            .transform(normalizeAmenityText)
            .pipe(z.string().min(1).max(MAX_CUSTOM_LENGTH)),
        )
        .max(MAX_CUSTOM_ITEMS),
    })
    .strict()
    .superRefine((value, context) => {
      for (const key of Object.keys(value.standard)) {
        const definition = catalogByKey.get(key);

        if (!definition) {
          context.addIssue({
            code: "custom",
            path: ["standard", key],
            message: "Tiện ích tiêu chuẩn không hợp lệ.",
          });
          continue;
        }

        if (!supportsScope(definition.scopes, scope)) {
          context.addIssue({
            code: "custom",
            path: ["standard", key],
            message: "Tiện ích này không thuộc phạm vi đã chọn.",
          });
        }
      }
    })
    .transform((value) => {
      const seen = new Set<string>();
      const custom = value.custom.filter((item) => {
        const key = duplicateKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        schema_version: 1 as const,
        standard: value.standard,
        custom,
      };
    });
}

export function validateAmenities(value: unknown, scope: AmenityScope) {
  return makeAmenitiesSchema(scope).safeParse(value);
}
