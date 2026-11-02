import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "@/server/action";

const testAuth = vi.hoisted(() => ({
  actor: null as null | { profileId: string; userId: string; email: string; fullName: string; isAdmin: boolean },
  error: null as Error | null,
}));

vi.mock("@/server/auth", () => ({
  requireAdmin: async () => {
    if (testAuth.error) throw testAuth.error;
    if (!testAuth.actor) throw new Error("No admin actor set");
    return testAuth.actor;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { approveListing, rejectListing } from "@/server/admin/actions";
import { prisma } from "@/server/db";

const databaseUrl = process.env.DATABASE_URL;
const propertyIds: string[] = [];
const authUserIds: string[] = [];
let databaseAvailable = false;

async function createUser(isAdmin = false) {
  const userId = crypto.randomUUID();
  const email = `rent014-${userId}@rentos.test`;
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
      jsonb_build_object('full_name', 'RENT-014 test'), now(), now(),
      ${userId}, ${userId + "-r"}, ${userId + "-n"}, '', ${userId + "-c"},
      '', ${userId + "-p"}, ${userId + "-a"}, false, false
    )`;
  databaseAvailable = true;
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
  if (isAdmin) await prisma.userProfile.update({ where: { id: profile.id }, data: { isAdmin: true } });
  return { profileId: profile.id, userId, email, fullName: profile.fullName, isAdmin };
}

async function createPendingListing(ownerId: string) {
  const property = await prisma.property.create({
    data: {
      ownerId,
      name: "RENT-014 moderation home",
      propertyType: "HOUSE",
      rentalArrangement: "WHOLE_SPACE",
      contentRevision: 1,
    },
  });
  await prisma.unit.create({
    data: {
      propertyId: property.id,
      label: "Toàn bộ nhà",
      normalizedLabel: "toan bo nha",
      unitKind: "HOUSE",
      bedrooms: 2,
      bathrooms: 1,
      bathroomArrangement: "PRIVATE",
      minimumRentalMonths: 3,
    },
  });
  propertyIds.push(property.id);
  const listing = await prisma.listing.create({
    data: {
      propertyId: property.id,
      title: "RENT-014 pending listing",
      description: "Moderation test package",
      moderationStatus: "PENDING",
      submittedAt: new Date(),
      submittedContentRevision: property.contentRevision,
    },
  });
  return { property, listing };
}

async function cleanUp() {
  if (databaseAvailable) {
    for (const propertyId of propertyIds) {
      const listings = await prisma.listing.findMany({ where: { propertyId }, select: { id: true } });
      await prisma.notification.deleteMany({ where: { resourceType: "listing", resourceId: { in: listings.map((item) => item.id) } } });
      await prisma.listing.deleteMany({ where: { propertyId } });
      await prisma.unit.deleteMany({ where: { propertyId } });
      await prisma.property.deleteMany({ where: { id: propertyId } });
    }
    for (const userId of authUserIds) {
      await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    }
  }
  propertyIds.length = 0;
  authUserIds.length = 0;
  databaseAvailable = false;
  testAuth.actor = null;
  testAuth.error = null;
}

describe.skipIf(!databaseUrl)("RENT-014 admin listing review", { timeout: 30_000 }, () => {
  afterEach(cleanUp);

  it("approves only the submitted revision, leaves publication unchanged, and rejects a second decision", async () => {
    const owner = await createUser();
    const admin = await createUser(true);
    testAuth.actor = admin;
    const { property, listing } = await createPendingListing(owner.profileId);

    const result = await approveListing(listing.id, property.contentRevision);
    expect(result.ok).toBe(true);
    const saved = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(saved).toMatchObject({
      moderationStatus: "APPROVED",
      publicationStatus: "DRAFT",
      reviewedById: admin.profileId,
      approvedContentRevision: property.contentRevision,
    });
    expect(saved.reviewedAt).toBeInstanceOf(Date);
    expect(await prisma.notification.findFirst({ where: { recipientId: owner.profileId, resourceId: listing.id, audience: "OWNER" } })).not.toBeNull();

    const secondDecision = await approveListing(listing.id, property.contentRevision);
    expect(secondDecision).toMatchObject({ ok: false, error: "Tin đăng này đã được quản trị viên quyết định." });
  });

  it("refuses approval after the property's content revision changes", async () => {
    const owner = await createUser();
    const admin = await createUser(true);
    testAuth.actor = admin;
    const { property, listing } = await createPendingListing(owner.profileId);
    await prisma.property.update({ where: { id: property.id }, data: { contentRevision: { increment: 1 } } });

    const result = await approveListing(listing.id, property.contentRevision);
    expect(result).toMatchObject({ ok: false, error: "Nội dung đã thay đổi sau khi bạn mở hồ sơ. Tải lại để xem bản mới nhất." });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).moderationStatus).toBe("PENDING");
    expect(await prisma.notification.count({ where: { resourceId: listing.id } })).toBe(0);
  });

  it("requires a rejection reason and sends the owner the decision reason", async () => {
    const owner = await createUser();
    const admin = await createUser(true);
    testAuth.actor = admin;
    const { listing } = await createPendingListing(owner.profileId);

    const empty = await rejectListing(listing.id, "  ");
    expect(empty).toMatchObject({ ok: false, fieldErrors: { reason: "Vui lòng nhập lý do từ chối." } });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).moderationStatus).toBe("PENDING");

    const rejected = await rejectListing(listing.id, "Vui lòng bổ sung ảnh thực tế.");
    expect(rejected.ok).toBe(true);
    expect(await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({
      moderationStatus: "REJECTED",
      reviewReason: "Vui lòng bổ sung ảnh thực tế.",
      reviewedById: admin.profileId,
    });
    expect(await prisma.notification.findFirst({ where: { recipientId: owner.profileId, resourceId: listing.id, audience: "OWNER", body: { contains: "Vui lòng bổ sung ảnh thực tế." } } })).not.toBeNull();
  });

  it("blocks the action when the admin guard rejects the caller", async () => {
    testAuth.error = new ActionError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    const result = await approveListing(crypto.randomUUID(), 1);
    expect(result).toMatchObject({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." });
  });
});
