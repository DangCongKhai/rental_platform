import { Prisma } from "../../../generated/prisma/client";

export function publiclyVisibleSql(): Prisma.Sql {
  return Prisma.sql`
    l.publication_status = 'PUBLISHED'
    AND l.moderation_status = 'APPROVED'
    AND l.archived_at IS NULL
    AND l.admin_suspended_at IS NULL
    AND ${publicPropertyContentSql()}
  `;
}

export function publicPropertyContentSql(): Prisma.Sql {
  return Prisma.sql`
    p.archived_at IS NULL
    AND p.address_line IS NOT NULL
    AND btrim(p.address_line) <> ''
    AND p.city IS NOT NULL
    AND btrim(p.city) <> ''
    AND p.description IS NOT NULL
    AND btrim(p.description) <> ''
  `;
}

export function marketedUnitSql(): Prisma.Sql {
  return Prisma.sql`
    u.operational_status = 'READY'
    AND u.is_marketed = true
    AND u.archived_at IS NULL
    AND u.description IS NOT NULL
    AND btrim(u.description) <> ''
    AND u.area_m2 IS NOT NULL
    AND u.advertised_monthly_rent IS NOT NULL
    AND u.deposit IS NOT NULL
    AND u.max_occupants IS NOT NULL
  `;
}
