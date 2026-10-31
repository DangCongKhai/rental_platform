import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testAuth = vi.hoisted(() => ({
  currentUser: null as null | {
    profileId: string;
    userId: string;
    email: string;
    fullName: string;
    isAdmin: boolean;
    avatarUrl: string;
  },
}));

const storageFake = vi.hoisted(() => ({
  uploadMediaObject: vi.fn(async () => undefined),
  removeMediaObject: vi.fn(async () => undefined),
  createMediaSignedUrls: vi.fn(async (paths: string[]) => paths.map((path) => `https://signed.test/${path}`)),
}));

vi.mock("@/server/auth", () => ({
  requireOwner: async (propertyId: string) => {
    if (!testAuth.currentUser) throw new Error("No test user set");
    const { prisma } = await import("@/server/db");
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId: testAuth.currentUser.profileId },
      select: { id: true },
    });
    if (!property) {
      const { ActionError } = await import("@/server/action");
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    }
    return testAuth.currentUser;
  },
}));

vi.mock("@/server/media-storage", () => storageFake);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { removePhoto, replacePhoto, setSharedPhotoForUnit, updateGallery, uploadPhoto } from "../app/owner/properties/media-actions";
import { prisma } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const propertyIds: string[] = [];
const authUserIds: string[] = [];

async function createTestUser(label: string) {
  const userId = crypto.randomUUID();
  const email = `rent011-${label}-${userId}@rentos.test`;
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
      jsonb_build_object('full_name', 'RENT-011 test'),
      now(), now(), ${userId}, ${userId + "-r"}, ${userId + "-n"}, '',
      ${userId + "-c"}, '', ${userId + "-p"}, ${userId + "-a"}, false, false
    )`;
  const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
  return {
    profileId: profile.id,
    userId,
    email,
    fullName: profile.fullName,
    isAdmin: false,
    avatarUrl: "",
  };
}

async function createProperty(ownerId: string, suffix: string) {
  const property = await prisma.property.create({
    data: {
      ownerId,
      name: `RENT-011 ${suffix} ${crypto.randomUUID()}`,
      propertyType: "APARTMENT",
      rentalArrangement: "SEPARATE_UNITS",
    },
  });
  propertyIds.push(property.id);
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      label: "S101",
      normalizedLabel: "s101",
      unitKind: "STUDIO",
      bedrooms: 0,
      bathrooms: 1,
      bathroomArrangement: "PRIVATE",
      minimumRentalMonths: 3,
    },
  });
  return { propertyId: property.id, unitId: unit.id };
}

function uploadForm(file: File, unitId?: string) {
  const formData = new FormData();
  formData.set("file", file);
  if (unitId) formData.set("unitId", unitId);
  return formData;
}

async function makePng() {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width: 4, height: 3, channels: 3, background: "green" } }).png().toBuffer();
}

async function addPhoto(propertyId: string, unitId?: string) {
  const result = await uploadPhoto(
    propertyId,
    uploadForm(new File([await makePng()], "room.png", { type: "image/png" }), unitId),
  );
  if (!result.ok || !result.data) throw new Error(result.ok ? "Upload returned no media" : result.error);
  return result.data;
}

async function createListing(propertyId: string, coverMediaId: string, publicationStatus = "PUBLISHED") {
  return prisma.listing.create({
    data: {
      propertyId,
      title: "RENT-011 test listing",
      description: "Media lifecycle integration test",
      coverMediaId,
      publicationStatus,
    },
  });
}

async function cleanUp() {
  for (const propertyId of propertyIds.splice(0)) {
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

describe.skipIf(!databaseUrl)("RENT-011 media upload integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanUp);

  it("uploads validated bytes, associates the same-property unit, and creates the row after upload", async () => {
    const owner = await createTestUser("owner");
    testAuth.currentUser = owner;
    const { propertyId, unitId } = await createProperty(owner.profileId, "property");
    const png = await makePng();
    storageFake.uploadMediaObject.mockImplementationOnce(async () => {
      expect(await prisma.propertyMedia.count({ where: { propertyId } })).toBe(0);
    });

    const result = await uploadPhoto(
      propertyId,
      uploadForm(new File([png], "room.png", { type: "image/png" }), unitId),
    );

    expect(result.ok).toBe(true);
    expect(storageFake.uploadMediaObject).toHaveBeenCalledOnce();
    const media = await prisma.propertyMedia.findFirstOrThrow({ where: { propertyId } });
    expect(media.unitId).toBe(unitId);
    expect(media.mimeType).toBe("image/png");
    expect(media.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(media.sizeBytes).toBe(BigInt(png.byteLength));
    expect(media.storagePath).toMatch(new RegExp(`^${propertyId}/units/${unitId}/[a-f0-9-]+\\.png$`));
    expect(await prisma.property.findUniqueOrThrow({ where: { id: propertyId } })).toMatchObject({ contentRevision: 2 });
    expect(result.ok && result.data?.signedUrl).toContain("https://signed.test/");
  });

  it("reuses one shared photo across units and only removes the chosen unit assignment", async () => {
    const owner = await createTestUser("shared-photo");
    testAuth.currentUser = owner;
    const { propertyId, unitId } = await createProperty(owner.profileId, "shared-photo");
    const secondUnit = await prisma.unit.create({
      data: {
        propertyId,
        label: "S102",
        normalizedLabel: "s102",
        unitKind: "STUDIO",
        bedrooms: 0,
        bathrooms: 1,
        bathroomArrangement: "PRIVATE",
        minimumRentalMonths: 3,
      },
    });
    const photo = await addPhoto(propertyId);

    expect((await setSharedPhotoForUnit(propertyId, unitId, photo.id, true)).ok).toBe(true);
    expect((await setSharedPhotoForUnit(propertyId, secondUnit.id, photo.id, true)).ok).toBe(true);
    expect(await prisma.propertyMedia.count({ where: { propertyId, deletedAt: null } })).toBe(1);
    expect(await prisma.unitMedia.count({ where: { mediaId: photo.id } })).toBe(2);
    expect(storageFake.uploadMediaObject).toHaveBeenCalledOnce();

    const blockedRemoval = await removePhoto(propertyId, photo.id);
    expect(blockedRemoval).toMatchObject({ ok: false });

    expect((await setSharedPhotoForUnit(propertyId, unitId, photo.id, false)).ok).toBe(true);
    expect(await prisma.unitMedia.findUnique({ where: { unitId_mediaId: { unitId, mediaId: photo.id } } })).toBeNull();
    expect(await prisma.unitMedia.findUnique({ where: { unitId_mediaId: { unitId: secondUnit.id, mediaId: photo.id } } })).not.toBeNull();
    expect((await prisma.propertyMedia.findUniqueOrThrow({ where: { id: photo.id } })).deletedAt).toBeNull();
  });

  it("rejects assigning a shared photo to a unit from another property", async () => {
    const owner = await createTestUser("shared-photo-scope");
    testAuth.currentUser = owner;
    const first = await createProperty(owner.profileId, "shared-photo-first");
    const second = await createProperty(owner.profileId, "shared-photo-second");
    const photo = await addPhoto(first.propertyId);

    const result = await setSharedPhotoForUnit(first.propertyId, second.unitId, photo.id, true);

    expect(result).toMatchObject({ ok: false, error: "Căn/phòng không thuộc bất động sản này." });
    expect(await prisma.unitMedia.count({ where: { mediaId: photo.id } })).toBe(0);
  });

  it("rejects text with a .jpg name without uploading or creating a row", async () => {
    const owner = await createTestUser("invalid");
    testAuth.currentUser = owner;
    const { propertyId } = await createProperty(owner.profileId, "invalid");

    const result = await uploadPhoto(
      propertyId,
      uploadForm(new File(["plain text"], "fake.jpg", { type: "image/jpeg" })),
    );

    expect(result).toMatchObject({ ok: false });
    expect(storageFake.uploadMediaObject).not.toHaveBeenCalled();
    expect(await prisma.propertyMedia.count({ where: { propertyId } })).toBe(0);
  });

  it("rejects a unit from a different property before touching storage", async () => {
    const owner = await createTestUser("scope");
    testAuth.currentUser = owner;
    const first = await createProperty(owner.profileId, "first");
    const second = await createProperty(owner.profileId, "second");

    const result = await uploadPhoto(
      first.propertyId,
      uploadForm(new File([await makePng()], "room.png", { type: "image/png" }), second.unitId),
    );

    expect(result).toMatchObject({ ok: false, error: "Căn/phòng không thuộc bất động sản này." });
    expect(storageFake.uploadMediaObject).not.toHaveBeenCalled();
    expect(await prisma.propertyMedia.count({ where: { propertyId: first.propertyId } })).toBe(0);
  });

  it("does not create a media row when Storage upload fails", async () => {
    const owner = await createTestUser("storage-failure");
    testAuth.currentUser = owner;
    const { propertyId } = await createProperty(owner.profileId, "storage-failure");
    storageFake.uploadMediaObject.mockRejectedValueOnce(new Error("storage unavailable"));

    const result = await uploadPhoto(
      propertyId,
      uploadForm(new File([await makePng()], "room.png", { type: "image/png" })),
    );

    expect(result).toMatchObject({ ok: false, error: "Không thể tải ảnh lên bộ nhớ. Hãy thử lại sau." });
    expect(await prisma.propertyMedia.count({ where: { propertyId } })).toBe(0);
  });

  it("does not upload for a property owned by someone else", async () => {
    const owner = await createTestUser("owner-check");
    const otherOwner = await createTestUser("other-owner");
    testAuth.currentUser = otherOwner;
    const { propertyId } = await createProperty(owner.profileId, "foreign");

    const result = await uploadPhoto(
      propertyId,
      uploadForm(new File([await makePng()], "room.png", { type: "image/png" })),
    );

    expect(result).toMatchObject({ ok: false });
    expect(storageFake.uploadMediaObject).not.toHaveBeenCalled();
    expect(await prisma.propertyMedia.count({ where: { propertyId } })).toBe(0);
  });

  it("saves captions, ordering, selection, and a valid shared cover together", async () => {
    const owner = await createTestUser("gallery");
    testAuth.currentUser = owner;
    const { propertyId, unitId } = await createProperty(owner.profileId, "gallery");
    const sharedPhoto = await addPhoto(propertyId);
    const unitPhoto = await addPhoto(propertyId, unitId);
    const listing = await createListing(propertyId, sharedPhoto.id, "DRAFT");

    const result = await updateGallery(propertyId, {
      items: [
        { id: sharedPhoto.id, caption: "  Mặt tiền  ", sortOrder: 1, isSelectedForListing: true },
      ],
      coverMediaId: sharedPhoto.id,
    });

    expect(result).toMatchObject({ ok: true, data: { contentRevision: 4 } });
    expect(await prisma.propertyMedia.findUniqueOrThrow({ where: { id: sharedPhoto.id } })).toMatchObject({
      caption: "Mặt tiền",
      sortOrder: 1,
      isSelectedForListing: true,
    });
    const unitGalleryResult = await updateGallery(propertyId, {
      items: [{ id: unitPhoto.id, caption: "Phòng ngủ", sortOrder: 0, isSelectedForListing: false }],
    }, unitId);
    expect(unitGalleryResult).toMatchObject({ ok: true, data: { contentRevision: 5 } });
    expect(await prisma.propertyMedia.findUniqueOrThrow({ where: { id: unitPhoto.id } })).toMatchObject({
      caption: "Phòng ngủ",
      sortOrder: 0,
      isSelectedForListing: false,
    });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).coverMediaId).toBe(sharedPhoto.id);
  });

  it("blocks deselecting a published cover until a new selected shared cover is chosen", async () => {
    const owner = await createTestUser("cover-change");
    testAuth.currentUser = owner;
    const { propertyId } = await createProperty(owner.profileId, "cover-change");
    const oldCover = await addPhoto(propertyId);
    const nextCover = await addPhoto(propertyId);
    const listing = await createListing(propertyId, oldCover.id);

    const blocked = await updateGallery(propertyId, {
      items: [
        { id: oldCover.id, caption: null, sortOrder: 0, isSelectedForListing: false },
        { id: nextCover.id, caption: null, sortOrder: 1, isSelectedForListing: true },
      ],
    });
    expect(blocked).toMatchObject({ ok: false });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).coverMediaId).toBe(oldCover.id);

    const changed = await updateGallery(propertyId, {
      items: [
        { id: oldCover.id, caption: null, sortOrder: 0, isSelectedForListing: false },
        { id: nextCover.id, caption: null, sortOrder: 1, isSelectedForListing: true },
      ],
      coverMediaId: nextCover.id,
    });
    expect(changed.ok).toBe(true);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).coverMediaId).toBe(nextCover.id);
  });

  it("soft-removes photos and requires a replacement for a published cover", async () => {
    const owner = await createTestUser("remove-cover");
    testAuth.currentUser = owner;
    const { propertyId } = await createProperty(owner.profileId, "remove-cover");
    const oldCover = await addPhoto(propertyId);
    const replacement = await addPhoto(propertyId);
    const listing = await createListing(propertyId, oldCover.id);

    const blocked = await removePhoto(propertyId, oldCover.id);
    expect(blocked).toMatchObject({ ok: false });
    expect((await prisma.propertyMedia.findUniqueOrThrow({ where: { id: oldCover.id } })).deletedAt).toBeNull();

    const removed = await removePhoto(propertyId, oldCover.id, replacement.id);
    expect(removed).toMatchObject({ ok: true, data: { removed: true } });
    expect((await prisma.propertyMedia.findUniqueOrThrow({ where: { id: oldCover.id } })).deletedAt).toBeInstanceOf(Date);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).coverMediaId).toBe(replacement.id);
  });

  it("replaces bytes with a new unique object and switches cover references", async () => {
    const owner = await createTestUser("replace");
    testAuth.currentUser = owner;
    const { propertyId } = await createProperty(owner.profileId, "replace");
    const oldPhoto = await addPhoto(propertyId);
    const listing = await createListing(propertyId, oldPhoto.id);

    const result = await replacePhoto(
      propertyId,
      oldPhoto.id,
      uploadForm(new File([await makePng()], "replacement.png", { type: "image/png" })),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) return;
    expect(result.data.id).not.toBe(oldPhoto.id);
    expect(await prisma.propertyMedia.findUniqueOrThrow({ where: { id: oldPhoto.id } })).toMatchObject({
      deletedAt: expect.any(Date),
      isSelectedForListing: false,
    });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).coverMediaId).toBe(result.data.id);
    expect(await prisma.propertyMedia.count({ where: { propertyId, deletedAt: null } })).toBe(1);
  });
});
