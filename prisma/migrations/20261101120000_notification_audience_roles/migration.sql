-- Replace the old generic USER audience with the recipient's role for the
-- referenced resource where it can be determined. Legacy unmatched items are
-- categorized as TENANT, the default consumer audience.
UPDATE "notifications" AS n
SET "audience" = CASE
  WHEN recipient."is_admin" THEN 'ADMIN'
  WHEN n."resource_type" = 'tenancy' AND EXISTS (
    SELECT 1 FROM "tenancies" t
    WHERE t."id" = n."resource_id" AND t."tenant_id" = recipient."id"
  ) THEN 'TENANT'
  WHEN n."resource_type" = 'tenancy' AND EXISTS (
    SELECT 1 FROM "tenancies" t
    WHERE t."id" = n."resource_id" AND t."owner_id" = recipient."id"
  ) THEN 'OWNER'
  WHEN n."resource_type" = 'rental_request' AND EXISTS (
    SELECT 1 FROM "rental_requests" r
    WHERE r."id" = n."resource_id" AND r."tenant_id" = recipient."id"
  ) THEN 'TENANT'
  WHEN n."resource_type" = 'rental_request' AND EXISTS (
    SELECT 1
    FROM "rental_requests" r
    JOIN "listings" l ON l."id" = r."listing_id"
    JOIN "properties" p ON p."id" = l."property_id"
    WHERE r."id" = n."resource_id" AND p."owner_id" = recipient."id"
  ) THEN 'OWNER'
  WHEN n."resource_type" = 'listing' AND EXISTS (
    SELECT 1
    FROM "listings" l
    JOIN "properties" p ON p."id" = l."property_id"
    WHERE l."id" = n."resource_id" AND p."owner_id" = recipient."id"
  ) THEN 'OWNER'
  ELSE 'TENANT'
END
FROM "user_profiles" AS recipient
WHERE recipient."id" = n."recipient_id"
  AND (n."audience" IS NULL OR n."audience" NOT IN ('ADMIN', 'TENANT', 'OWNER'));

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_audience_check"
CHECK ("audience" IN ('ADMIN', 'TENANT', 'OWNER'));
