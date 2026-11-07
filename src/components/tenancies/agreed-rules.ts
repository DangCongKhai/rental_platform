import {
  resolveEffectivePolicies,
  validatePropertyPolicies,
  validateUnitPolicyOverrides,
} from "@/domain/policies";

export type AgreedRulesView = {
  pets: string;
  smoking: string;
  rules: string[];
};

const labels = {
  ALLOWED: "Cho phép",
  NOT_ALLOWED: "Không cho phép",
  ASK_OWNER: "Trao đổi với chủ nhà",
} as const;

export function agreedRulesView(
  property: unknown,
  unit: unknown,
): AgreedRulesView {
  const parsedProperty = validatePropertyPolicies(property);
  const parsedUnit = validateUnitPolicyOverrides(unit);
  if (!parsedProperty.success || !parsedUnit.success) {
    return { pets: "Chưa có", smoking: "Chưa có", rules: [] };
  }
  const effective = resolveEffectivePolicies(
    parsedProperty.data,
    parsedUnit.data,
  );
  return {
    pets: labels[effective.defaults.pets],
    smoking: labels[effective.defaults.smoking],
    rules: effective.rules,
  };
}

export function agreedRulesFromSnapshot(snapshot: unknown): AgreedRulesView {
  const record =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? (snapshot as { property?: unknown; unit?: unknown })
      : {};
  return agreedRulesView(record.property, record.unit);
}
