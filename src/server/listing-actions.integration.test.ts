import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";

const testAuth = vi.hoisted(() => ({
  currentUser: null as null | { profileId: string; userId: string; email: string; fullName: string; isAdmin: boolean },
}));

vi.mock("@/server/auth", () => ({
  requireUser: async () => {
    if (!testAuth.currentUser) throw new Error("No test user set");
    return testAuth.currentUser;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { archiveListing, hideListing, publishListing, saveListing, submitListing } from "@/server/listings/owner-listing-actions";
import { prisma } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const propertyIds: string[] = [];
const authUserIds: string[] = [];

async function createUser(isAdmin = false) {
  const userId = crypto.randomUUID();
  const email = `rent012-${userId}@rentos.test`;
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
      jsonb_build_object('full_name', 'RENT-012 test'), now(), now(),
      ${userId}, ${userId + "-r"}, ${userId + "-n"}, '', ${userId + "-c"},
      '', ${userId + "-p"}, ${userId + "-a"}, false, false
    )`;
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
  if (isAdmin) await prisma.userProfile.update({ where: { id: profile.id }, data: { isAdmin: true } });
  return { profileId: profile.id, userId, email, fullName: profile.fullName, isAdmin };
}

async function createCompleteProperty(ownerId: string) {
  const property = await prisma.property.create({
    data: {
      ownerId,
      name: "RENT-012 test home",
      propertyType: "APARTMENT_BUILDING",
      rentalArrangement: "SEPARATE_UNITS",
      addressLine: "12 Trần Phú",
      ward: "Hải Châu",
      city: "Đà Nẵng",
      description: "Mô tả bất động sản đầy đủ.",
      sharedAmenities: { schema_version: 1, standard: {}, custom: [] },
      policies: { schema_version: 1, defaults: { pets: "ASK_OWNER", smoking: "NOT_ALLOWED" }, shared_rules: ["Giữ yên lặng sau 22 giờ"] },
    },
  });
  propertyIds.push(property.id);
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      label: "S201",
      normalizedLabel: "s201",
      unitKind: "STUDIO",
      description: "Studio đủ nội thất.",
      areaM2: 24,
      bedrooms: 0,
      bathrooms: 1,
      bathroomArrangement: "PRIVATE",
      amenities: { schema_version: 1, standard: {}, custom: [] },
      advertisedMonthlyRent: 3_800_000,
      deposit: 3_800_000,
      minimumRentalMonths: 3,
      maxOccupants: 2,
      isMarketed: true,
      policyOverrides: { schema_version: 1, overrides: {}, additional_rules: [] },
    },
  });
  const [cover] = await Promise.all([
    prisma.propertyMedia.create({
      data: {
        propertyId: property.id, uploadedById: ownerId, storagePath: `tests/${property.id}/cover-${crypto.randomUUID()}.jpg`,
        sha256: crypto.randomUUID().replaceAll("-", ""), mimeType: "image/jpeg", sizeBytes: 10_000, isSelectedForListing: true,
      },
    }),
    prisma.propertyMedia.create({
      data: {
        propertyId: property.id, unitId: unit.id, uploadedById: ownerId, storagePath: `tests/${property.id}/${unit.id}-${crypto.randomUUID()}.jpg`,
        sha256: crypto.randomUUID().replaceAll("-", ""), mimeType: "image/jpeg", sizeBytes: 10_000, isSelectedForListing: true,
      },
    }),
  ]);
  return { property, unit, cover };
}

async function cleanUp() {
  for (const propertyId of propertyIds.splice(0)) {
    const listings = await prisma.listing.findMany({ where: { propertyId }, select: { id: true } });
    await prisma.notification.deleteMany({ where: { resourceType: "listing", resourceId: { in: listings.map((listing) => listing.id) } } });
    await prisma.listing.deleteMany({ where: { propertyId } });
    await prisma.propertyMedia.deleteMany({ where: { propertyId } });
    await prisma.unit.deleteMany({ where: { propertyId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
  }
  for (const userId of authUserIds.splice(0)) {
    await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
  }
  testAuth.currentUser = null;
}

describe.skipIf(!databaseUrl)("RENT-012 owner listing actions", { timeout: 30_000 }, () => {
  afterEach(cleanUp);

  it("keeps the notification table required columns aligned with the application contract", async () => {
    const requiredColumns = await prisma.$queryRaw<Array<{
      columnName: string;
      dataType: string;
      udtName: string;
      columnDefault: string | null;
    }>>`
      SELECT column_name AS "columnName",
             data_type AS "dataType",
             udt_name AS "udtName",
             column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND is_nullable = 'NO'
        AND column_default IS NULL
      ORDER BY ordinal_position`;
    expect(
      requiredColumns.map(({ columnName }) => columnName),
      `Unexpected required notification fields: ${JSON.stringify(requiredColumns)}`,
    ).toEqual(["recipient_id", "event_key", "title", "body", "resource_type", "resource_id", "audience"]);
  });

  it("saves one listing draft and submits a complete package with admin notification", async () => {
    const owner = await createUser();
    const admin = await createUser(true);
    testAuth.currentUser = owner;
    const { property, cover } = await createCompleteProperty(owner.profileId);

    const saved = await saveListing(property.id, {
      expectedRevision: property.contentRevision,
      title: "Studio gần biển Mỹ Khê",
      description: "Căn hộ yên tĩnh, gần biển.",
      coverMediaId: cover.id,
      marketedUnitIds: [(await prisma.unit.findFirstOrThrow({ where: { propertyId: property.id } })).id],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok || !saved.data) throw new Error("Draft was not saved.");
    expect(saved.data.issues).toEqual([]);

    const duplicate = await saveListing(property.id, {
      expectedRevision: saved.data.contentRevision,
      title: "Another draft",
      description: "Duplicate should not be created.",
      coverMediaId: cover.id,
      marketedUnitIds: [],
    });
    expect(duplicate).toMatchObject({ ok: false });

    const submitted = await submitListing(saved.data.id);
    expect(submitted.ok).toBe(true);
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: saved.data.id } });
    expect(listing.moderationStatus).toBe("PENDING");
    expect(listing.submittedContentRevision).toBe(saved.data.contentRevision);
    expect(await prisma.notification.count({ where: { recipientId: admin.profileId, resourceId: listing.id } })).toBe(1);

    const edited = await saveListing(property.id, {
      listingId: listing.id,
      expectedRevision: saved.data.contentRevision,
      title: "Studio đã cập nhật",
      description: "Nội dung đổi sau khi gửi duyệt.",
      coverMediaId: cover.id,
      marketedUnitIds: [(await prisma.unit.findFirstOrThrow({ where: { propertyId: property.id } })).id],
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok || !edited.data) throw new Error("Pending listing edit was not saved.");
    const staleSubmission = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(staleSubmission.submittedContentRevision).not.toBe(edited.data.contentRevision);
  });

  it("names the marketed unit that needs a photo before submission", async () => {
    const owner = await createUser();
    testAuth.currentUser = owner;
    const { property, cover, unit } = await createCompleteProperty(owner.profileId);
    await prisma.propertyMedia.deleteMany({ where: { propertyId: property.id, unitId: unit.id } });
    const saved = await saveListing(property.id, {
      expectedRevision: property.contentRevision,
      title: "Tin thiếu ảnh",
      description: "Mô tả tin.",
      coverMediaId: cover.id,
      marketedUnitIds: [unit.id],
    });
    if (!saved.ok || !saved.data) throw new Error("Draft was not saved.");
    expect(saved.data.issues.some((issue) => issue.message.includes("S201") && issue.message.includes("ảnh"))).toBe(true);
    const result = await submitListing(saved.data.id);
    expect(result).toMatchObject({ ok: false });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: saved.data.id } })).moderationStatus).toBe("DRAFT");
  });

  it("publishes only after approval and can hide or archive without deleting the listing", async () => {
    const owner = await createUser();
    testAuth.currentUser = owner;
    const { property, cover, unit } = await createCompleteProperty(owner.profileId);
    const listing = await prisma.listing.create({
      data: {
        propertyId: property.id, title: "Được duyệt", description: "Mô tả.", coverMediaId: cover.id,
        moderationStatus: "PENDING", submittedContentRevision: property.contentRevision,
      },
    });
    expect((await publishListing(listing.id)).ok).toBe(false);
    await prisma.listing.update({ where: { id: listing.id }, data: { moderationStatus: "APPROVED", approvedContentRevision: property.contentRevision } });
    const published = await publishListing(listing.id);
    expect(published.ok).toBe(true);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).publicationStatus).toBe("PUBLISHED");
    const edited = await saveListing(property.id, {
      listingId: listing.id,
      expectedRevision: property.contentRevision,
      title: "Tiêu đề cập nhật sau duyệt",
      description: "Mô tả cập nhật.",
      coverMediaId: cover.id,
      marketedUnitIds: [unit.id],
    });
    expect(edited.ok).toBe(true);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).moderationStatus).toBe("APPROVED");
    expect((await hideListing(listing.id)).ok).toBe(true);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).publicationStatus).toBe("HIDDEN");
    expect((await archiveListing(listing.id)).ok).toBe(true);
    const archived = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(archived.archivedAt).not.toBeNull();
    expect(await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } })).toBeTruthy();
  });
});
