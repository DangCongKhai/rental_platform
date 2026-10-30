import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../src/server/db";
import { createNotification } from "../src/server/notifications";
import { daNangPlaces } from "./seed-data/da-nang-places";
import { libraryFileMeta, libraryImagesFor } from "./seed-data/image-library";
import { adminId, haoId, lanId, linhId, maiId, seedId, seedPeople } from "./seed-data/ids";

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const PASSWORD = "RentOS-demo-2026";
const PREFIX = "01900000-0000-7000-%";
const QUIET_POLICIES = {
  schema_version: 1,
  defaults: { pets: "NOT_ALLOWED", smoking: "NOT_ALLOWED" },
  shared_rules: ["Quiet hours after 22:00"],
};
const SHARED_AMENITIES = {
  schema_version: 1,
  standard: { wifi: { enabled: true }, elevator: { enabled: true } },
  custom: [],
};
const UNIT_AMENITIES = {
  schema_version: 1,
  standard: { air_conditioning: { enabled: true } },
  custom: [],
};
const S205_OVERRIDES = {
  schema_version: 1,
  overrides: { pets: "ASK_OWNER" },
  additional_rules: [],
};

type Tx = Prisma.TransactionClient;

function hex64(n: number): string {
  return n.toString(16).padStart(64, "0");
}

async function exec(tx: Tx, sql: string, ...values: unknown[]) {
  await tx.$executeRawUnsafe(sql, ...values);
}

async function clear(tx: Tx) {
  await exec(tx, `SET LOCAL session_replication_role = replica`);
  await exec(
    tx,
    `UPDATE tenancies
     SET pending_contract_id = NULL, latest_confirmed_contract_id = NULL
     WHERE id::text LIKE $1`,
    PREFIX,
  );
  await exec(tx, `DELETE FROM notifications WHERE event_key LIKE 'seed:%' OR recipient_id::text LIKE $1`, PREFIX);
  for (const table of [
    "favourite_properties",
    "listing_reports",
    "tenancy_contracts",
    "tenancy_renewal_requests",
    "tenancies",
    "rental_requests",
    "listings",
    "property_media",
    "units",
    "properties",
  ]) {
    await exec(tx, `DELETE FROM ${table} WHERE id::text LIKE $1`, PREFIX);
  }
  await exec(tx, `SET LOCAL session_replication_role = origin`);
  await exec(tx, `DELETE FROM auth.identities WHERE user_id::text LIKE $1`, PREFIX);
  await exec(tx, `DELETE FROM auth.users WHERE id::text LIKE $1`, PREFIX);
}

async function insertPeople(tx: Tx) {
  for (const person of seedPeople) {
    const auth = seedId(1, person.n);
    const profile = seedId(2, person.n);
    await exec(
      tx,
      `INSERT INTO auth.users (
         id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change_token_new, email_change,
         email_change_token_current, phone_change, phone_change_token,
         reauthentication_token, is_sso_user, is_anonymous
       ) VALUES (
         $1::uuid, 'authenticated', 'authenticated', $2,
         extensions.crypt($3, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', $4::text, 'avatar_url', $5::text),
         now(), now(),
         $1::text, $1::text || '-r', $1::text || '-n', '',
         $1::text || '-c', '', $1::text || '-p', $1::text || '-a',
         false, false
       )`,
      auth,
      person.email,
      PASSWORD,
      person.name,
      person.avatar,
    );
    await exec(
      tx,
      `INSERT INTO auth.identities (
         user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
       ) VALUES (
         $1::uuid, $1::text,
         jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true),
         'email', now(), now(), now()
       )`,
      auth,
      person.email,
    );
    await exec(
      tx,
      `UPDATE user_profiles
       SET id = $2::uuid, full_name = $3, phone = $4, is_admin = $5, updated_at = now()
       WHERE user_id = $1::uuid`,
      auth,
      profile,
      person.name,
      person.phone,
      person.admin,
    );
    const copied = await tx.$queryRawUnsafe<Array<{ avatar_url: string | null }>>(
      `SELECT avatar_url FROM user_profiles WHERE id = $1::uuid`,
      profile,
    );
    if (copied[0]?.avatar_url !== person.avatar) {
      throw new Error(`avatar_url was not copied for ${person.email}`);
    }
  }
}

function ownerFor(index: number): string {
  if (index === 0 || index === 1 || index === 4) return linhId;
  if (index === 2 || index === 3 || index === 5) return haoId;
  return index % 2 === 0 ? linhId : haoId;
}

async function insertInventory(tx: Tx) {
  const now = new Date().toISOString();
  const properties: Record<string, unknown[]> = {
    id: [], owner: [], name: [], description: [], type: [], arrangement: [],
    address: [], latitude: [], longitude: [], amenities: [], policies: [],
  };
  const units: Record<string, unknown[]> = {
    id: [], property: [], label: [], normalized: [], kind: [], area: [], bedrooms: [], description: [], amenities: [], rent: [], overrides: [],
  };
  const media: Record<string, unknown[]> = {
    id: [], property: [], unit: [], owner: [], path: [], caption: [], sort: [], sha: [], mime: [], size: [],
  };
  const listings: Record<string, unknown[]> = {
    id: [], property: [], title: [], description: [], cover: [], moderation: [], publication: [],
    submittedAt: [], reviewedBy: [], reviewedAt: [], reason: [], submittedRevision: [], approvedRevision: [],
    suspendedAt: [], suspendedBy: [], suspensionReason: [], archivedAt: [],
  };

  let mediaNumber = 1;
  for (let index = 0; index < daNangPlaces.length; index += 1) {
    const place = daNangPlaces[index];
    const propertyId = seedId(3, index + 1);
    const owner = ownerFor(index);
    const generatedName = `Căn hộ Đà Nẵng ${index + 1}`;
    const name = index === 0 ? (place.name ?? "Nhà Linh") : (place.name ?? generatedName);
    properties.id.push(propertyId);
    properties.owner.push(owner);
    properties.name.push(name);
    properties.description.push(`${name} is a rentOS seed property in Da Nang.`);
    properties.type.push(index === 0 ? "APARTMENT_BUILDING" : "APARTMENT");
    properties.arrangement.push(index === 0 || index === 5 ? "SEPARATE_UNITS" : "WHOLE_SPACE");
    properties.address.push(place.addressLine ?? name);
    properties.latitude.push(place.latitude);
    properties.longitude.push(place.longitude);
    properties.amenities.push(JSON.stringify(index === 0 ? SHARED_AMENITIES : { schema_version: 1, standard: {}, custom: [] }));
    properties.policies.push(JSON.stringify(index === 0 ? QUIET_POLICIES : {
      schema_version: 1,
      defaults: { pets: "ASK_OWNER", smoking: "NOT_ALLOWED" },
      shared_rules: [],
    }));

    const rows =
      index === 0
        ? ["S201", "S202", "S203", "S204", "S205"].map((label, offset) => ({
            id: seedId(4, offset + 1), label, kind: "STUDIO", area: "28", bedrooms: 0, rent: 4_500_000,
          }))
        : index === 5
          ? [
              { id: seedId(4, 6), label: "A", kind: "STUDIO", area: "28", bedrooms: 0, rent: 4_500_000 },
              { id: seedId(4, 7), label: "B", kind: "STUDIO", area: "28", bedrooms: 0, rent: 4_500_000 },
              { id: seedId(4, 8), label: "C", kind: "STUDIO", area: "28", bedrooms: 0, rent: 4_500_000 },
            ]
          : [{
              id: seedId(4, 1000 + index), label: "Entire property", kind: "APARTMENT",
              area: "45", bedrooms: 1, rent: 5_000_000 + index * 50_000,
            }];
    for (const unit of rows) {
      units.id.push(unit.id);
      units.property.push(propertyId);
      units.label.push(unit.label);
      units.normalized.push(unit.label.normalize("NFC").trim().toLocaleLowerCase("vi"));
      units.description.push(`Phòng ${unit.label} tại ${name}.`);
      units.kind.push(unit.kind);
      units.area.push(unit.area);
      units.bedrooms.push(unit.bedrooms);
      units.amenities.push(JSON.stringify(index === 0 ? UNIT_AMENITIES : { schema_version: 1, standard: {}, custom: [] }));
      units.rent.push(unit.rent);
      units.overrides.push(JSON.stringify(unit.label === "S205" ? S205_OVERRIDES : {}));
    }

    const images = libraryImagesFor(properties.type.at(-1) as string, rows[0].kind, index + 1);
    let coverId: string | null = null;
    for (const [imageIndex, image] of images.entries()) {
      const mediaId = seedId(5, mediaNumber);
      mediaNumber += 1;
      const file = libraryFileMeta(image.file);
      media.id.push(mediaId);
      media.property.push(propertyId);
      media.unit.push(image.level === "unit" ? rows[0].id : "");
      media.owner.push(owner);
      media.path.push(image.storage_path);
      media.caption.push(`${image.caption} — ${name}`);
      media.sort.push(imageIndex);
      media.sha.push(file.sha256);
      media.mime.push("image/webp");
      media.size.push(file.sizeBytes);
      if (image.level === "property" && coverId == null) coverId = mediaId;
    }

    const draft = index === 1;
    const pending = index === 2;
    const rejected = index === 3;
    const hidden = index === 4;
    const suspended = index === 5;
    const moderation = draft ? "DRAFT" : pending ? "PENDING" : rejected ? "REJECTED" : "APPROVED";
    listings.id.push(seedId(6, index + 1));
    listings.property.push(propertyId);
    listings.title.push(name);
    listings.description.push(`${name} is available through rentOS.`);
    listings.cover.push(draft ? null : coverId);
    listings.moderation.push(moderation);
    listings.publication.push(draft || pending || rejected ? "DRAFT" : hidden ? "HIDDEN" : "PUBLISHED");
    listings.submittedAt.push(draft ? null : now);
    listings.reviewedBy.push(moderation === "APPROVED" || rejected ? adminId : null);
    listings.reviewedAt.push(moderation === "APPROVED" || rejected ? now : null);
    listings.reason.push(rejected ? "Photos do not show the rooms." : null);
    listings.submittedRevision.push(draft ? null : 1);
    listings.approvedRevision.push(moderation === "APPROVED" ? 1 : null);
    listings.suspendedAt.push(suspended ? now : null);
    listings.suspendedBy.push(suspended ? adminId : null);
    listings.suspensionReason.push(suspended ? "Suspended after a resolved report." : null);
    listings.archivedAt.push(null);
  }

  listings.id.push(seedId(6, 201));
  listings.property.push(seedId(3, 1));
  listings.title.push("Archived studio listing");
  listings.description.push("Replaced by the current studio listing.");
  listings.cover.push(null);
  listings.moderation.push("APPROVED");
  listings.publication.push("HIDDEN");
  listings.submittedAt.push(null);
  listings.reviewedBy.push(null);
  listings.reviewedAt.push(null);
  listings.reason.push(null);
  listings.submittedRevision.push(null);
  listings.approvedRevision.push(null);
  listings.suspendedAt.push(null);
  listings.suspendedBy.push(null);
  listings.suspensionReason.push(null);
  listings.archivedAt.push(now);

  await exec(
    tx,
    `INSERT INTO properties (
       id, owner_id, name, description, property_type, rental_arrangement, address_line,
       city, latitude, longitude, shared_amenities, policies
     )
     SELECT id, owner_id, name, description, property_type, rental_arrangement, address_line,
            'Đà Nẵng', latitude, longitude, shared_amenities::jsonb, policies::jsonb
     FROM unnest(
       $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[],
       $8::numeric[], $9::numeric[], $10::text[], $11::text[]
     ) AS row(id, owner_id, name, description, property_type, rental_arrangement, address_line,
              latitude, longitude, shared_amenities, policies)`,
    properties.id, properties.owner, properties.name, properties.description, properties.type,
    properties.arrangement, properties.address, properties.latitude,
    properties.longitude, properties.amenities, properties.policies,
  );
  await exec(
    tx,
    `INSERT INTO units (
       id, property_id, label, normalized_label, unit_kind, description, floor, area_m2, bedrooms, bathrooms, bathroom_arrangement,
       amenities, advertised_monthly_rent, deposit, minimum_rental_months, max_occupants,
       operational_status, is_marketed, policy_overrides
     )
     SELECT id, property_id, label, normalized_label, unit_kind, description, '2', area_m2, bedrooms, 1, 'PRIVATE', amenities::jsonb,
            rent, rent, 3, 2, 'READY', true, overrides::jsonb
     FROM unnest(
       $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::numeric[], $8::int[], $9::text[],
       $10::numeric[], $11::text[]
     ) AS row(id, property_id, label, normalized_label, unit_kind, description, area_m2, bedrooms, amenities, rent, overrides)`,
    units.id, units.property, units.label, units.normalized, units.kind, units.description, units.area, units.bedrooms,
    units.amenities, units.rent, units.overrides,
  );
  await exec(
    tx,
    `INSERT INTO property_media (
       id, property_id, unit_id, uploaded_by, storage_path, caption, sort_order, sha256, mime_type, size_bytes
     )
     SELECT id, property_id, NULLIF(unit_id, '')::uuid, uploaded_by, storage_path, caption, sort_order,
            sha256, mime_type, size_bytes
     FROM unnest(
       $1::uuid[], $2::uuid[], $3::text[], $4::uuid[], $5::text[], $6::text[], $7::int[], $8::text[], $9::text[], $10::bigint[]
     ) AS row(id, property_id, unit_id, uploaded_by, storage_path, caption, sort_order, sha256, mime_type, size_bytes)`,
    media.id, media.property, media.unit, media.owner, media.path, media.caption, media.sort, media.sha, media.mime, media.size,
  );
  await exec(
    tx,
    `INSERT INTO listings (
       id, property_id, title, description, cover_media_id, moderation_status, publication_status,
       submitted_at, reviewed_by, reviewed_at, review_reason, submitted_content_revision,
       approved_content_revision, admin_suspended_at, admin_suspended_by, suspension_reason, archived_at
     )
     SELECT id, property_id, title, description, cover_media_id, moderation_status, publication_status,
            submitted_at::timestamptz, reviewed_by, reviewed_at::timestamptz, review_reason,
            submitted_content_revision, approved_content_revision, admin_suspended_at::timestamptz,
            admin_suspended_by, suspension_reason, archived_at::timestamptz
     FROM unnest(
       $1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::uuid[], $6::text[], $7::text[],
       $8::text[], $9::uuid[], $10::text[], $11::text[], $12::int[], $13::int[],
       $14::text[], $15::uuid[], $16::text[], $17::text[]
     ) AS row(
       id, property_id, title, description, cover_media_id, moderation_status, publication_status,
       submitted_at, reviewed_by, reviewed_at, review_reason, submitted_content_revision,
       approved_content_revision, admin_suspended_at, admin_suspended_by, suspension_reason, archived_at
     )`,
    listings.id, listings.property, listings.title, listings.description, listings.cover,
    listings.moderation, listings.publication, listings.submittedAt, listings.reviewedBy,
    listings.reviewedAt, listings.reason, listings.submittedRevision, listings.approvedRevision,
    listings.suspendedAt, listings.suspendedBy, listings.suspensionReason, listings.archivedAt,
  );
}

async function request(
  tx: Tx,
  n: number,
  input: {
    listingN: number;
    tenantId: string;
    name: string;
    phone: string;
    status: string;
    start: string;
    end: string;
    unitId?: string;
    reason?: string;
    reviewed?: boolean;
  },
) {
  await exec(
    tx,
    `INSERT INTO rental_requests (
       id, listing_id, tenant_id, preferred_unit_id, desired_move_in_date, desired_end_date,
       message, status, outcome_reason, contact_name, contact_phone, closed_at
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, $6::date, 'Seed request', $7, $8, $9, $10,
       CASE WHEN $7 = 'PENDING' THEN NULL ELSE now() END
     )`,
    seedId(7, n),
    seedId(6, input.listingN),
    input.tenantId,
    input.unitId ?? null,
    input.start,
    input.end,
    input.status,
    input.reason ?? null,
    input.name,
    input.phone,
  );
}

async function tenancy(
  tx: Tx,
  n: number,
  input: {
    unitId: string;
    requestN: number;
    tenantId: string;
    ownerId: string;
    status: string;
    confirmedStart?: string;
    confirmedEnd?: string;
    blockedStart?: string;
    blockedEnd?: string;
    expires?: boolean;
    movedIn?: boolean;
    ended?: boolean;
    endReason?: string;
  },
) {
  await exec(
    tx,
    `INSERT INTO tenancies (
       id, unit_id, rental_request_id, tenant_id, owner_id, status,
       confirmed_start_date, confirmed_end_date, blocked_start_date, blocked_end_date,
       confirmation_expires_at, moved_in_at, actual_ended_at, end_reason
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6,
       $7::date, $8::date, $9::date, $10::date,
       CASE WHEN $11::boolean THEN now() + interval '2 days' ELSE NULL END,
       CASE WHEN $12::boolean THEN now() ELSE NULL END,
       CASE WHEN $13::boolean THEN now() ELSE NULL END,
       $14
     )`,
    seedId(8, n),
    input.unitId,
    seedId(7, input.requestN),
    input.tenantId,
    input.ownerId,
    input.status,
    input.confirmedStart ?? null,
    input.confirmedEnd ?? null,
    input.blockedStart ?? null,
    input.blockedEnd ?? null,
    input.expires ?? false,
    input.movedIn ?? false,
    input.ended ?? false,
    input.endReason ?? null,
  );
}

async function contract(
  tx: Tx,
  n: number,
  input: {
    tenancyN: number;
    version: number;
    type: "ORIGINAL" | "RENEWAL";
    start: string;
    end: string;
    rent: number;
    ownerId: string;
    basisN?: number;
    renewalN?: number;
    confirmTenant?: boolean;
    rejectReason?: string;
  },
) {
  const id = seedId(9, n);
  await exec(
    tx,
    `INSERT INTO tenancy_contracts (
       id, tenancy_id, version_number, type, start_date, end_date, monthly_rent, deposit_amount,
       policies_snapshot, document_path, document_sha256, created_by, owner_confirmed_at,
       basis_contract_id, renewal_request_id
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5::date, $6::date, $7, $7, $8::jsonb, $9, $10, $11::uuid, now(),
       $12::uuid, $13::uuid
     )`,
    id,
    seedId(8, input.tenancyN),
    input.version,
    input.type,
    input.start,
    input.end,
    input.rent,
    JSON.stringify(QUIET_POLICIES),
    `contracts/seed/${id}.pdf`,
    hex64(10_000 + n),
    input.ownerId,
    input.basisN ? seedId(9, input.basisN) : null,
    input.renewalN ? seedId(10, input.renewalN) : null,
  );
  if (input.confirmTenant) {
    await exec(tx, `UPDATE tenancy_contracts SET tenant_confirmed_at = now() WHERE id = $1::uuid`, id);
  }
  if (input.rejectReason) {
    await exec(
      tx,
      `UPDATE tenancy_contracts
       SET tenant_rejected_at = now(), tenant_rejection_reason = $2
       WHERE id = $1::uuid`,
      id,
      input.rejectReason,
    );
  }
}

async function renewal(
  tx: Tx,
  n: number,
  input: {
    tenancyN: number;
    end: string;
    rent: number;
    status: string;
    reviewer?: string;
    reason?: string;
  },
) {
  await exec(
    tx,
    `INSERT INTO tenancy_renewal_requests (
       id, tenancy_id, requested_end_date, proposed_monthly_rent, message, status,
       reviewed_at, reviewed_by, review_reason
     ) VALUES (
       $1::uuid, $2::uuid, $3::date, $4, 'Seed renewal', $5,
       CASE WHEN $5 = 'PENDING' THEN NULL ELSE now() END,
       $6::uuid, $7
     )`,
    seedId(10, n),
    seedId(8, input.tenancyN),
    input.end,
    input.rent,
    input.status,
    input.reviewer ?? null,
    input.reason ?? null,
  );
}

async function pointAt(tx: Tx, tenancyN: number, pendingN: number | null, latestN: number | null) {
  await exec(
    tx,
    `UPDATE tenancies
     SET pending_contract_id = $2::uuid, latest_confirmed_contract_id = $3::uuid
     WHERE id = $1::uuid`,
    seedId(8, tenancyN),
    pendingN ? seedId(9, pendingN) : null,
    latestN ? seedId(9, latestN) : null,
  );
}

async function insertStory(tx: Tx) {
  await request(tx, 1, {
    listingN: 1, tenantId: maiId, name: "Mai", phone: "0901000004", status: "ACCEPTED",
    unitId: seedId(4, 1), start: "2026-01-01", end: "2026-06-30",
  });
  await tenancy(tx, 1, {
    unitId: seedId(4, 1), requestN: 1, tenantId: maiId, ownerId: linhId, status: "ACTIVE",
    confirmedStart: "2026-01-01", confirmedEnd: "2026-06-30",
    blockedStart: "2026-01-01", blockedEnd: "2026-12-31", expires: true, movedIn: true,
  });
  await contract(tx, 1, {
    tenancyN: 1, version: 1, type: "ORIGINAL", start: "2026-01-01", end: "2026-06-30",
    rent: 4_500_000, ownerId: linhId, confirmTenant: true,
  });
  await renewal(tx, 1, { tenancyN: 1, end: "2026-12-31", rent: 5_200_000, status: "PENDING" });
  await contract(tx, 2, {
    tenancyN: 1, version: 2, type: "RENEWAL", start: "2026-07-01", end: "2026-12-31",
    rent: 5_200_000, ownerId: linhId, basisN: 1, renewalN: 1,
  });
  await pointAt(tx, 1, 2, 1);

  await request(tx, 2, {
    listingN: 1, tenantId: lanId, name: "Lan", phone: "0901000005", status: "ACCEPTED",
    unitId: seedId(4, 2), start: "2026-08-01", end: "2026-12-31",
  });
  await tenancy(tx, 2, {
    unitId: seedId(4, 2), requestN: 2, tenantId: lanId, ownerId: linhId, status: "CONFIRMED",
    confirmedStart: "2026-08-01", confirmedEnd: "2026-12-31",
    blockedStart: "2026-08-01", blockedEnd: "2026-12-31",
  });
  await contract(tx, 3, {
    tenancyN: 2, version: 1, type: "ORIGINAL", start: "2026-08-01", end: "2026-12-31",
    rent: 4_500_000, ownerId: linhId, confirmTenant: true,
  });
  await renewal(tx, 2, {
    tenancyN: 2, end: "2027-06-30", rent: 5_200_000, status: "REJECTED",
    reviewer: linhId, reason: "The studio is reserved after December.",
  });
  await pointAt(tx, 2, null, 3);

  await request(tx, 3, {
    listingN: 1, tenantId: maiId, name: "Mai", phone: "0901000004", status: "ACCEPTED",
    unitId: seedId(4, 3), start: "2026-03-01", end: "2026-05-31",
  });
  await tenancy(tx, 3, {
    unitId: seedId(4, 3), requestN: 3, tenantId: maiId, ownerId: linhId, status: "PENDING_CONFIRMATION",
    blockedStart: "2026-03-01", blockedEnd: "2026-05-31", expires: true,
  });
  await contract(tx, 4, {
    tenancyN: 3, version: 1, type: "ORIGINAL", start: "2026-03-01", end: "2026-05-31",
    rent: 4_500_000, ownerId: linhId,
  });
  await pointAt(tx, 3, 4, null);

  await request(tx, 4, {
    listingN: 1, tenantId: lanId, name: "Lan", phone: "0901000005", status: "ACCEPTED",
    unitId: seedId(4, 4), start: "2026-09-01", end: "2026-11-30",
  });
  await tenancy(tx, 4, {
    unitId: seedId(4, 4), requestN: 4, tenantId: lanId, ownerId: linhId, status: "AWAITING_REVISION",
  });
  await contract(tx, 5, {
    tenancyN: 4, version: 1, type: "ORIGINAL", start: "2026-09-01", end: "2026-11-30",
    rent: 4_500_000, ownerId: linhId, rejectReason: "The end date should be 30 November.",
  });

  await request(tx, 5, {
    listingN: 6, tenantId: maiId, name: "Mai", phone: "0901000004", status: "ACCEPTED",
    unitId: seedId(4, 6), start: "2026-02-01", end: "2026-04-30",
  });
  await tenancy(tx, 5, {
    unitId: seedId(4, 6), requestN: 5, tenantId: maiId, ownerId: haoId, status: "EXPIRED",
  });

  await request(tx, 6, {
    listingN: 6, tenantId: lanId, name: "Lan", phone: "0901000005", status: "ACCEPTED",
    unitId: seedId(4, 7), start: "2026-05-01", end: "2026-07-31",
  });
  await tenancy(tx, 6, {
    unitId: seedId(4, 7), requestN: 6, tenantId: lanId, ownerId: haoId, status: "CANCELLED",
    ended: true, endReason: "The tenant cancelled before moving in.",
  });
  await renewal(tx, 3, { tenancyN: 6, end: "2026-10-31", rent: 4_500_000, status: "CANCELLED" });

  await request(tx, 7, {
    listingN: 5, tenantId: maiId, name: "Mai", phone: "0901000004", status: "ACCEPTED",
    unitId: seedId(4, 1004), start: "2025-01-01", end: "2025-12-31",
  });
  await tenancy(tx, 7, {
    unitId: seedId(4, 1004), requestN: 7, tenantId: maiId, ownerId: linhId, status: "ENDED",
    confirmedStart: "2025-01-01", confirmedEnd: "2025-12-31",
    ended: true, endReason: "The agreed term ended.",
  });
  await contract(tx, 7, {
    tenancyN: 7, version: 1, type: "ORIGINAL", start: "2025-01-01", end: "2025-06-30",
    rent: 5_200_000, ownerId: linhId, confirmTenant: true,
  });
  await renewal(tx, 4, {
    tenancyN: 7, end: "2025-12-31", rent: 5_200_000, status: "ACCEPTED", reviewer: linhId,
  });
  await contract(tx, 8, {
    tenancyN: 7, version: 2, type: "RENEWAL", start: "2025-07-01", end: "2025-12-31",
    rent: 5_200_000, ownerId: linhId, basisN: 7, renewalN: 4, confirmTenant: true,
  });
  await pointAt(tx, 7, null, 8);

  await request(tx, 20, {
    listingN: 1, tenantId: lanId, name: "Lan", phone: "0901000005", status: "PENDING",
    start: "2027-03-01", end: "2027-05-31",
  });
  await request(tx, 21, {
    listingN: 1, tenantId: maiId, name: "Mai", phone: "0901000004", status: "REJECTED",
    start: "2027-01-01", end: "2027-02-28", reason: "The requested studio is not available.",
  });
  await request(tx, 22, {
    listingN: 1, tenantId: maiId, name: "Mai", phone: "0901000004", status: "WITHDRAWN",
    start: "2027-06-01", end: "2027-08-31", reason: "The tenant withdrew the request.",
  });

  await exec(
    tx,
    `INSERT INTO listing_reports (
       id, listing_id, reporter_id, reason_code, description, status,
       resolution_summary, reviewed_by, reviewed_at
     ) VALUES
       ($1::uuid, $5::uuid, $6::uuid, 'MISLEADING', 'The photos do not match the studio.', 'OPEN', NULL, NULL, NULL),
       ($2::uuid, $5::uuid, $7::uuid, 'OTHER', 'The rent on the listing looks wrong.', 'REVIEWING', NULL, NULL, NULL),
       ($3::uuid, $5::uuid, $8::uuid, 'OTHER', 'This listing should no longer be public.', 'RESOLVED', 'The listing was suspended.', $9::uuid, now()),
       ($4::uuid, $10::uuid, $8::uuid, 'OTHER', 'Hidden listing report.', 'DISMISSED', 'The listing is not public.', $9::uuid, now())`,
    seedId(11, 1),
    seedId(11, 2),
    seedId(11, 3),
    seedId(11, 4),
    seedId(6, 1),
    lanId,
    maiId,
    haoId,
    adminId,
    seedId(6, 5),
  );
  await exec(
    tx,
    `INSERT INTO favourite_properties (id, user_id, property_id) VALUES
       ($1::uuid, $2::uuid, $3::uuid),
       ($4::uuid, $5::uuid, $6::uuid)`,
    seedId(12, 1),
    maiId,
    seedId(3, 1),
    seedId(12, 2),
    lanId,
    seedId(3, 5),
  );

  await createNotification(tx, {
    recipientId: linhId,
    eventKey: `seed:proposal:${seedId(8, 3)}`,
    title: "A contract is waiting for the tenant",
    body: "Mai has a studio contract to confirm.",
    link: { resourceType: "tenancy", resourceId: seedId(8, 3) },
  });
  await createNotification(tx, {
    recipientId: maiId,
    eventKey: `seed:active:${seedId(8, 1)}`,
    title: "Your tenancy is active",
    body: "Studio S201 is active.",
    link: { resourceType: "tenancy", resourceId: seedId(8, 1) },
  });
}

export async function main() {
  if (daNangPlaces.length < 200) throw new Error("Da Nang seed data has fewer than 200 places.");
  await prisma.$transaction(
    async (tx) => {
      await clear(tx);
      await insertPeople(tx);
      await insertInventory(tx);
      await insertStory(tx);
    },
    { timeout: 120_000 },
  );
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("seed.ts") || entry.endsWith("seed.js") || import.meta.url === pathToFileURL(entry).href) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
