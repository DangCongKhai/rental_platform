import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../db";

type PetValue = "ALLOWED" | "ASK_OWNER" | "NOT_ALLOWED";

export type FixtureUnit = {
  label?: string;
  unitKind?: "ROOM" | "STUDIO" | "APARTMENT" | "HOUSE";
  rent?: number;
  bedrooms?: number;
  pets?: PetValue | null;
  amenities?: Record<string, boolean>;
  custom?: string[];
  operationalStatus?: "READY" | "MAINTENANCE" | "RETIRED";
  isMarketed?: boolean;
  minimumRentalMonths?: number;
  maxOccupants?: number | null;
  description?: string | null;
};

export type PublishedListingInput = {
  ward?: string;
  city?: string;
  addressLine?: string;
  publicationStatus?: "DRAFT" | "PUBLISHED" | "HIDDEN";
  moderationStatus?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  adminSuspended?: boolean;
  propertyAmenities?: Record<string, boolean>;
  propertyPets?: PetValue;
  units?: FixtureUnit[];
};

export type PublishedListing = {
  listingId: string;
  propertyId: string;
  unitIds: string[];
  owner: { profileId: string; userId: string; fullName: string };
  coverMediaId: string;
};

const propertyIds: string[] = [];
const authUserIds: string[] = [];

function amenities(standard: Record<string, boolean> = {}, custom: string[] = []) {
  return {
    schema_version: 1,
    standard: Object.fromEntries(
      Object.entries(standard).map(([key, enabled]) => [key, { enabled }]),
    ),
    custom,
  };
}

function policies(pets: PetValue) {
  return {
    schema_version: 1,
    defaults: { pets, smoking: "NOT_ALLOWED" as const },
    shared_rules: ["Giữ yên lặng sau 22 giờ"],
  };
}

async function createAuthUser(fullName: string) {
  const userId = crypto.randomUUID();
  const email = `rent003-${userId}@rentos.test`;
  authUserIds.push(userId);

  await prisma.$executeRaw`
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token, is_sso_user, is_anonymous
    ) VALUES (
      ${userId}::uuid, 'authenticated', 'authenticated', ${email}, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', ${fullName}::text),
      now(), now(), ${userId}, ${userId + "-r"}, ${userId + "-n"}, '',
      ${userId + "-c"}, '', ${userId + "-p"}, ${userId + "-a"}, false, false
    )`;

  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
  return { profileId: profile.id, userId, fullName: profile.fullName };
}

export async function publishedListing(overrides: PublishedListingInput = {}): Promise<PublishedListing> {
  const owner = await createAuthUser("RENT-003 owner");
  const units = overrides.units ?? [{}];
  const property = await prisma.property.create({
    data: {
      ownerId: owner.profileId,
      name: "Nhà Hải Châu",
      propertyType: "APARTMENT_BUILDING",
      rentalArrangement: "SEPARATE_UNITS",
      addressLine: overrides.addressLine ?? "12 Trần Phú",
      ward: overrides.ward ?? "Hải Châu",
      city: overrides.city ?? "Đà Nẵng",
      description: "Nhà gần trung tâm, mô tả đầy đủ cho tin công khai.",
      sharedAmenities: amenities(overrides.propertyAmenities),
      policies: policies(overrides.propertyPets ?? "ASK_OWNER"),
    },
  });
  propertyIds.push(property.id);

  const createdUnits: { id: string; label: string }[] = [];
  for (const [index, unit] of units.entries()) {
    const label = unit.label ?? `Phòng ${index + 1}`;
    const description = unit.description === undefined ? "Phòng đầy đủ nội thất." : unit.description;
    const policyOverrides = unit.pets == null
      ? {}
      : { schema_version: 1, overrides: { pets: unit.pets }, additional_rules: [] };
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO units (
        property_id, label, normalized_label, unit_kind, description, area_m2, bedrooms, bathrooms,
        bathroom_arrangement, amenities, advertised_monthly_rent, deposit, minimum_rental_months,
        max_occupants, operational_status, is_marketed, policy_overrides, updated_at
      ) VALUES (
        ${property.id}::uuid,
        ${label},
        ${label.normalize("NFC").trim().toLocaleLowerCase("vi")},
        ${unit.unitKind ?? "STUDIO"},
        ${description},
        28,
        ${unit.bedrooms ?? 1},
        1,
        'PRIVATE',
        ${JSON.stringify(amenities(unit.amenities, unit.custom))}::jsonb,
        ${unit.rent ?? 3_500_000},
        3500000,
        ${unit.minimumRentalMonths ?? 3},
        ${unit.maxOccupants === undefined ? 2 : unit.maxOccupants},
        ${unit.operationalStatus ?? "READY"},
        ${unit.isMarketed ?? true},
        ${JSON.stringify(policyOverrides)}::jsonb,
        now()
      )
      RETURNING id::text AS id
    `;
    createdUnits.push({ id: rows[0].id, label });
  }

  const cover = await prisma.propertyMedia.create({
    data: {
      propertyId: property.id,
      uploadedById: owner.profileId,
      storagePath: `tests/${property.id}/cover.jpg`,
      sha256: property.id.replaceAll("-", ""),
      mimeType: "image/jpeg",
      sizeBytes: 120_000,
      caption: "Mặt tiền",
      isSelectedForListing: true,
    },
  });

  for (const unit of createdUnits) {
    await prisma.propertyMedia.create({
      data: {
        propertyId: property.id,
        unitId: unit.id,
        uploadedById: owner.profileId,
        storagePath: `tests/${property.id}/${unit.id}.jpg`,
        sha256: unit.id.replaceAll("-", ""),
        mimeType: "image/jpeg",
        sizeBytes: 80_000,
        caption: unit.label,
        isSelectedForListing: true,
      },
    });
  }

  const published = (overrides.publicationStatus ?? "PUBLISHED") === "PUBLISHED"
    && (overrides.moderationStatus ?? "APPROVED") === "APPROVED";

  const listing = await prisma.listing.create({
    data: {
      propertyId: property.id,
      title: `Tin ${property.id.slice(0, 8)}`,
      description: "Tin đăng công khai cho tìm kiếm.",
      coverMediaId: cover.id,
      publicationStatus: overrides.publicationStatus ?? "PUBLISHED",
      moderationStatus: overrides.moderationStatus ?? "APPROVED",
      submittedAt: published ? new Date("2026-10-01T00:00:00.000Z") : null,
      reviewedAt: published ? new Date("2026-10-02T00:00:00.000Z") : null,
      reviewedById: published ? owner.profileId : null,
      submittedContentRevision: published ? 1 : null,
      approvedContentRevision: published ? 1 : null,
      adminSuspendedAt: overrides.adminSuspended ? new Date("2026-10-03T00:00:00.000Z") : null,
      adminSuspendedById: overrides.adminSuspended ? owner.profileId : null,
      suspensionReason: overrides.adminSuspended ? "Vi phạm quy định" : null,
    },
  });

  return {
    listingId: listing.id,
    propertyId: property.id,
    unitIds: createdUnits.map((unit) => unit.id),
    owner,
    coverMediaId: cover.id,
  };
}

export async function blockUnit(
  unitId: string,
  start: string,
  end: string,
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "ACTIVE" = "PENDING_CONFIRMATION",
) {
  if (status !== "PENDING_CONFIRMATION") {
    throw new Error("The fixture builds a pending confirmation hold.");
  }

  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    include: { property: { include: { listings: true } } },
  });
  const listing = unit.property.listings[0];
  if (!listing) throw new Error("Unit has no listing to attach a hold.");

  const tenant = await createAuthUser("RENT-003 tenant");
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  await prisma.$transaction(async (tx) => {
    const request = await tx.rentalRequest.create({
      data: {
        listingId: listing.id,
        tenantId: tenant.profileId,
        preferredUnitId: unit.id,
        desiredMoveInDate: startDate,
        desiredEndDate: endDate,
        message: "Giữ chỗ cho bài kiểm tra.",
        contactName: tenant.fullName,
        contactPhone: "0900000000",
        status: "ACCEPTED",
      },
    });

    const tenancy = await tx.tenancy.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.profileId,
        ownerId: unit.property.ownerId,
        rentalRequestId: request.id,
        status: "PENDING_CONFIRMATION",
        blockedStartDate: startDate,
        blockedEndDate: endDate,
        confirmationExpiresAt: new Date("2027-12-01T00:00:00.000Z"),
      },
    });

    const contract = await tx.tenancyContract.create({
      data: {
        tenancyId: tenancy.id,
        versionNumber: 1,
        type: "ORIGINAL",
        startDate,
        endDate,
        monthlyRent: unit.advertisedMonthlyRent ?? 3_500_000,
        depositAmount: unit.deposit ?? 3_500_000,
        policiesSnapshot: policies("ASK_OWNER"),
        documentPath: `tests/contracts/${tenancy.id}.pdf`,
        documentSha256: tenancy.id.replaceAll("-", ""),
        createdById: unit.property.ownerId,
        ownerConfirmedAt: new Date("2026-10-20T00:00:00.000Z"),
      },
    });

    await tx.tenancy.update({
      where: { id: tenancy.id },
      data: { pendingContractId: contract.id },
    });
  });
}

const testOwnerSql = Prisma.sql`
  SELECT properties.id FROM properties
  JOIN user_profiles ON user_profiles.id = properties.owner_id
  WHERE user_profiles.email LIKE 'rent003-%@rentos.test'
`;

export async function cleanupPublicListings() {
  propertyIds.splice(0);
  authUserIds.splice(0);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    await tx.$executeRaw`
      UPDATE tenancies
      SET pending_contract_id = NULL,
          latest_confirmed_contract_id = NULL,
          status = 'CANCELLED',
          blocked_start_date = NULL,
          blocked_end_date = NULL,
          confirmation_expires_at = NULL,
          actual_ended_at = now(),
          end_reason = 'test cleanup'
      WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (${testOwnerSql}))`;
    await tx.$executeRaw`
      DELETE FROM tenancy_contracts
      WHERE tenancy_id IN (
        SELECT id FROM tenancies
        WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (${testOwnerSql}))
      )`;
    await tx.$executeRaw`
      DELETE FROM tenancies
      WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (${testOwnerSql}))`;
    await tx.$executeRaw`
      DELETE FROM rental_requests
      WHERE listing_id IN (SELECT id FROM listings WHERE property_id IN (${testOwnerSql}))`;
    await tx.$executeRaw`DELETE FROM listings WHERE property_id IN (${testOwnerSql})`;
    await tx.$executeRaw`DELETE FROM property_media WHERE property_id IN (${testOwnerSql})`;
    await tx.$executeRaw`DELETE FROM units WHERE property_id IN (${testOwnerSql})`;
    await tx.$executeRaw`DELETE FROM properties WHERE id IN (${testOwnerSql})`;
    await tx.$executeRaw`DELETE FROM auth.users WHERE email LIKE 'rent003-%@rentos.test'`;
  }, { timeout: 30_000 });
}
