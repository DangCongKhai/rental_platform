import type { Prisma } from "../../../generated/prisma/client";
export function isHoldExpired(
  tenancy: { confirmationExpiresAt: Date | null },
  now: Date,
) {
  return (
    tenancy.confirmationExpiresAt !== null &&
    tenancy.confirmationExpiresAt <= now
  );
}
/** Callers lock units first, in ascending ID order, then requests/tenancies. */
export async function releaseExpiredHolds(
  tx: Prisma.TransactionClient,
  unitIds: string[],
  now: Date,
): Promise<void> {
  if (!unitIds.length) return;
  const ids = [...new Set(unitIds)].sort();
  for (const id of ids)
    await tx.$queryRaw`SELECT id FROM units WHERE id = ${id}::uuid FOR UPDATE`;
  const due = await tx.tenancy.findMany({
    where: {
      unitId: { in: ids },
      pendingContractId: { not: null },
      confirmationExpiresAt: { lte: now },
    },
    orderBy: { id: "asc" },
    select: { id: true, pendingContractId: true },
  });
  for (const row of due) {
    await tx.$queryRaw`SELECT id FROM tenancies WHERE id = ${row.id}::uuid FOR UPDATE`;
    const t = await tx.tenancy.findUniqueOrThrow({ where: { id: row.id } });
    if (
      !t.pendingContractId ||
      t.pendingContractId !== row.pendingContractId ||
      !isHoldExpired(t, now)
    )
      continue;
    const confirmed = t.latestConfirmedContractId !== null;
    await tx.tenancy.update({
      where: { id: t.id },
      data: {
        status: confirmed ? t.status : "EXPIRED",
        pendingContractId: null,
        confirmationExpiresAt: null,
        blockedStartDate: confirmed ? t.confirmedStartDate : null,
        blockedEndDate: confirmed ? t.confirmedEndDate : null,
      },
    });
  }
}
