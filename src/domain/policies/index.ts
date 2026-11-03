import { z } from "zod";

export const POLICY_VALUES = ["ALLOWED", "NOT_ALLOWED", "ASK_OWNER"] as const;

export type PolicyValue = (typeof POLICY_VALUES)[number];

const policyValueSchema = z.enum(POLICY_VALUES);

const ruleSchema = z
  .string()
  .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
  .pipe(
    z
      .string()
      .min(1, "Quy định không được để trống.")
      .max(240, "Quy định không được dài quá 240 ký tự.")
      .refine((value) => !/[<>]/u.test(value), {
        message: "Chỉ nhập nội dung văn bản thuần.",
      }),
  );

const rulesSchema = z.array(ruleSchema).max(30);

const propertyPoliciesSchema = z
  .object({
    schema_version: z.literal(1),
    defaults: z
      .object({
        pets: policyValueSchema,
        smoking: policyValueSchema,
      })
      .strict(),
    shared_rules: rulesSchema,
  })
  .strict();

const versionedUnitOverridesSchema = z
  .object({
    schema_version: z.literal(1),
    overrides: z
      .object({
        pets: policyValueSchema.optional(),
        smoking: policyValueSchema.optional(),
      })
      .strict(),
    additional_rules: rulesSchema,
  })
  .strict();

const unitOverridesSchema = z.preprocess((value) => {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return {
      schema_version: 1,
      overrides: {},
      additional_rules: [],
    };
  }

  return value;
}, versionedUnitOverridesSchema);

export type PropertyPolicies = z.output<typeof propertyPoliciesSchema>;
export type UnitPolicyOverrides = z.output<typeof unitOverridesSchema>;

export function validatePropertyPolicies(value: unknown) {
  return propertyPoliciesSchema.safeParse(value);
}

export function validateUnitPolicyOverrides(value: unknown) {
  return unitOverridesSchema.safeParse(value);
}

export function resolveEffectivePolicies(
  property: PropertyPolicies,
  unit: UnitPolicyOverrides,
) {
  const defaults = {
    pets: unit.overrides.pets ?? property.defaults.pets,
    smoking: unit.overrides.smoking ?? property.defaults.smoking,
  };

  return {
    schema_version: 1 as const,
    defaults,
    shared_rules: [...property.shared_rules],
    additional_rules: [...unit.additional_rules],
    rules: [...property.shared_rules, ...unit.additional_rules],
  };
}
