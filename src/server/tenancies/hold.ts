import type { HoldTenancy } from "@/domain/tenancies/occupancy";

export const currentHoldStatuses: string[] = [
  "PENDING_CONFIRMATION",
  "AWAITING_REVISION",
  "CONFIRMED",
  "ACTIVE",
];

export function dateOnly(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toHoldTenancy(tenancy: {
  id: string;
  status: string;
  confirmedStartDate: Date | null;
  confirmedEndDate: Date | null;
  blockedStartDate: Date | null;
  blockedEndDate: Date | null;
  confirmationExpiresAt: Date | null;
  tenant: { fullName: string };
}): HoldTenancy {
  return {
    id: tenancy.id,
    status: tenancy.status,
    confirmedStart: dateOnly(tenancy.confirmedStartDate),
    confirmedEnd: dateOnly(tenancy.confirmedEndDate),
    blockedStart: dateOnly(tenancy.blockedStartDate),
    blockedEnd: dateOnly(tenancy.blockedEndDate),
    confirmationExpiresAt:
      tenancy.confirmationExpiresAt?.toISOString() ?? null,
    tenantName: tenancy.tenant.fullName,
  };
}
