import { describe, expect, it } from "vitest";
import {
  resolveEffectivePolicies,
  validatePropertyPolicies,
  validateUnitPolicyOverrides,
} from "./index";

describe("property and unit policies", () => {
  it("accepts the legacy empty unit override and returns the versioned shape", () => {
    const result = validateUnitPolicyOverrides({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        schema_version: 1,
        overrides: {},
        additional_rules: [],
      });
    }
  });

  it("inherits property defaults and keeps shared rules when resolving a unit", () => {
    const property = validatePropertyPolicies({
      schema_version: 1,
      defaults: {
        pets: "NOT_ALLOWED",
        smoking: "NOT_ALLOWED",
      },
      shared_rules: ["Giữ yên tĩnh sau 22:00"],
    });
    const unit = validateUnitPolicyOverrides({
      schema_version: 1,
      overrides: { pets: "ASK_OWNER" },
      additional_rules: ["Không hút thuốc trong phòng"],
    });

    expect(property.success).toBe(true);
    expect(unit.success).toBe(true);
    if (!property.success || !unit.success) return;

    expect(resolveEffectivePolicies(property.data, unit.data)).toEqual({
      schema_version: 1,
      defaults: {
        pets: "ASK_OWNER",
        smoking: "NOT_ALLOWED",
      },
      shared_rules: ["Giữ yên tĩnh sau 22:00"],
      additional_rules: ["Không hút thuốc trong phòng"],
      rules: ["Giữ yên tĩnh sau 22:00", "Không hút thuốc trong phòng"],
    });
  });

  it("rejects unknown policy keys and markup in rules", () => {
    const unknownKey = validatePropertyPolicies({
      schema_version: 1,
      defaults: {
        pets: "NOT_ALLOWED",
        smoking: "NOT_ALLOWED",
        ownerOnly: "ALLOWED",
      },
      shared_rules: [],
    });
    const markup = validatePropertyPolicies({
      schema_version: 1,
      defaults: {
        pets: "NOT_ALLOWED",
        smoking: "NOT_ALLOWED",
      },
      shared_rules: ["<script>alert(1)</script>"],
    });

    expect(unknownKey.success).toBe(false);
    expect(markup.success).toBe(false);
  });
});
