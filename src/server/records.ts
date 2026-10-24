import { prisma } from "./db";

export async function findPropertyOwnerId(propertyId: string) {
  const rows = await prisma.$queryRaw<Array<{ owner_id: string }>>`
    SELECT owner_id FROM properties WHERE id = ${propertyId}::uuid
  `;
  return rows[0]?.owner_id ?? null;
}

export async function findTenancyParties(tenancyId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ owner_id: string; tenant_id: string }>
  >`
    SELECT owner_id, tenant_id FROM tenancies WHERE id = ${tenancyId}::uuid
  `;
  const row = rows[0];
  if (!row) return null;
  return { ownerId: row.owner_id, tenantId: row.tenant_id };
}
