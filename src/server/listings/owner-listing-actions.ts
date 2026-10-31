"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateAmenities } from "@/domain/amenities";
import { checkListingCompleteness, type ListingCompletenessIssue } from "@/domain/listings/completeness";
import { todayInVietnam } from "@/domain/discovery/unit-availability";
import { validatePropertyPolicies, validateUnitPolicyOverrides } from "@/domain/policies";
import { ActionError, runAction } from "@/server/action";
import { requireUser } from "@/server/auth";
import { createNotification } from "@/server/notifications";
import { prisma } from "@/server/db";
import { marketedUnitSql, publicPropertyContentSql } from "./visibility";

const uuid = z.string().uuid();
const saveSchema = z.object({
  listingId: uuid.nullable().optional(),
  expectedRevision: z.number().int().positive(),
  title: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  coverMediaId: uuid.nullable(),
  marketedUnitIds: z.array(uuid).max(100),
}).strict();
const coverSchema = z.object({
  listingId: uuid.nullable(),
  expectedRevision: z.number().int().positive(),
  coverMediaId: uuid,
}).strict();

const listingCompletenessInclude = {
  units: {
    where: { archivedAt: null },
    include: {
      media: {
        where: { deletedAt: null, purgedAt: null, isSelectedForListing: true },
        select: { id: true },
      },
      mediaAssignments: {
        where: {
          isSelectedForListing: true,
          media: { deletedAt: null, purgedAt: null },
        },
        select: { mediaId: true },
      },
    },
  },
} as const;

async function getCompleteness(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  propertyId: string,
  listing: { title: string; description: string; coverMediaId: string | null },
): Promise<ListingCompletenessIssue[]> {
  const property = await tx.property.findUnique({
    where: { id: propertyId },
    include: {
      ...listingCompletenessInclude,
      media: {
        where: { unitId: null, deletedAt: null, purgedAt: null, isSelectedForListing: true },
        select: { id: true },
      },
    },
  });
  if (!property) throw new ActionError("NOT_FOUND", "Không tìm thấy bất động sản.");

  const propertyPolicies = validatePropertyPolicies(property.policies);
  const units = property.units.map((unit) => {
    const unitAmenities = validateAmenities(unit.amenities, "UNIT");
    const unitPolicies = validateUnitPolicyOverrides(unit.policyOverrides);
    return {
      id: unit.id,
      label: unit.label,
      isMarketed: property.rentalArrangement === "WHOLE_SPACE" || unit.isMarketed,
      description: unit.description,
      areaM2: unit.areaM2 === null ? null : Number(unit.areaM2),
      advertisedMonthlyRent: unit.advertisedMonthlyRent === null ? null : Number(unit.advertisedMonthlyRent),
      deposit: unit.deposit === null ? null : Number(unit.deposit),
      minimumRentalMonths: unit.minimumRentalMonths,
      maxOccupants: unit.maxOccupants,
      hasSelectedPhoto: unit.media.length > 0 || unit.mediaAssignments.length > 0,
      policiesValid: unitAmenities.success && unitPolicies.success,
    };
  });
  const policiesValid = propertyPolicies.success && units.every((unit) => unit.policiesValid);

  return checkListingCompleteness({
    rentalArrangement: property.rentalArrangement as "WHOLE_SPACE" | "SEPARATE_UNITS",
    title: listing.title,
    description: listing.description,
    addressLine: property.addressLine,
    city: property.city,
    propertyDescription: property.description,
    hasSelectedSharedPhoto: property.media.length > 0,
    hasSelectedCover: Boolean(listing.coverMediaId && property.media.some((item) => item.id === listing.coverMediaId)),
    policiesValid,
    units,
  });
}

function issuesAsMessage(issues: ListingCompletenessIssue[]) {
  return `Chưa thể tiếp tục. ${issues.map((issue) => issue.message).join(" ")}`;
}

function revalidateListingPaths(propertyId: string, listingId?: string) {
  revalidatePath("/owner/listings");
  revalidatePath("/owner/properties");
  revalidatePath(`/owner/properties/${propertyId}`);
  if (listingId) revalidatePath(`/owner/listings/${listingId}`);
  revalidatePath("/listings");
  if (listingId) revalidatePath(`/listings/${listingId}`);
}

export async function saveListing(propertyId: string, input: unknown) {
  if (!uuid.safeParse(propertyId).success) return { ok: false as const, error: "Không tìm thấy dữ liệu." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Thông tin tin đăng không hợp lệ." };

  const user = auth.data;
  const data = parsed.data;
  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ contentRevision: number; rentalArrangement: string }>>`
      SELECT content_revision AS "contentRevision",
             rental_arrangement AS "rentalArrangement"
      FROM properties
      WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
      FOR UPDATE`;
    if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    if (locked[0].contentRevision !== data.expectedRevision) {
      throw new ActionError("CONFLICT", "Thông tin bất động sản đã thay đổi. Tải lại trang trước khi lưu.");
    }

    const current = await tx.listing.findFirst({ where: { propertyId, archivedAt: null } });
    if (data.listingId && current?.id !== data.listingId) {
      throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");
    }
    if (current && data.listingId !== current.id) {
      throw new ActionError("CONFLICT", "Bất động sản này đã có tin đăng. Hãy mở tin hiện tại để chỉnh sửa.");
    }

    const propertyUnits = await tx.unit.findMany({ where: { propertyId, archivedAt: null }, select: { id: true, isMarketed: true } });
    const unitIds = locked[0].rentalArrangement === "WHOLE_SPACE"
      ? propertyUnits.map((unit) => unit.id)
      : [...new Set(data.marketedUnitIds)];
    if (unitIds.length !== data.marketedUnitIds.length) {
      if (locked[0].rentalArrangement !== "WHOLE_SPACE") {
        throw new ActionError("CONFLICT", "Danh sách căn/phòng bị lặp.");
      }
    }
    if (unitIds.some((id) => !propertyUnits.some((unit) => unit.id === id))) {
      throw new ActionError("NOT_FOUND", "Có căn/phòng không thuộc bất động sản này.");
    }
    if (data.coverMediaId) {
      const cover = await tx.propertyMedia.findFirst({
        where: { id: data.coverMediaId, propertyId, unitId: null, deletedAt: null, purgedAt: null, isSelectedForListing: true },
        select: { id: true },
      });
      if (!cover) throw new ActionError("CONFLICT", "Ảnh bìa phải là ảnh dùng chung đã chọn của bất động sản.");
    }

    const oldMarketed = new Set(propertyUnits.filter((unit) => unit.isMarketed).map((unit) => unit.id));
    const desiredMarketed = new Set(unitIds);
    const marketedChanged = propertyUnits.some((unit) => oldMarketed.has(unit.id) !== desiredMarketed.has(unit.id));
    if (marketedChanged) {
      await tx.unit.updateMany({ where: { propertyId, archivedAt: null }, data: { isMarketed: false } });
      if (unitIds.length > 0) await tx.unit.updateMany({ where: { id: { in: unitIds }, propertyId }, data: { isMarketed: true } });
    }

    const listingChanged = !current || current.title !== data.title || current.description !== data.description || current.coverMediaId !== data.coverMediaId;
    const listing = current
      ? await tx.listing.update({
          where: { id: current.id },
          data: { title: data.title, description: data.description, coverMediaId: data.coverMediaId },
        })
      : await tx.listing.create({
          data: { propertyId, title: data.title, description: data.description, coverMediaId: data.coverMediaId },
        });

    const contentChanged = listingChanged || marketedChanged;
    if (contentChanged) {
      await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
    }
    if (current?.moderationStatus === "PENDING" && contentChanged) {
      const admins = await tx.userProfile.findMany({
        where: { isAdmin: true, accountStatus: "ACTIVE" },
        select: { id: true },
      });
      const eventKey = `listing-updated-during-review:${current.id}:${randomUUID()}`;
      for (const admin of admins) {
        await createNotification(tx, {
          recipientId: admin.id,
          audience: "ADMIN",
          eventKey,
          title: "Tin đăng đang duyệt đã thay đổi",
          body: `Tin “${listing.title || "Chưa đặt tiêu đề"}” đã được chủ nhà cập nhật. Vui lòng xem lại nội dung mới nhất.`,
          link: { resourceType: "listing", resourceId: listing.id },
        });
      }
    }
    const issues = await getCompleteness(tx, propertyId, listing);
    if (current?.publicationStatus === "PUBLISHED" && issues.length > 0) {
      throw new ActionError("CONFLICT", `Không thể lưu vì tin đang công khai sẽ thiếu nội dung bắt buộc. ${issuesAsMessage(issues)}`);
    }
    return { id: listing.id, contentRevision: locked[0].contentRevision + (contentChanged ? 1 : 0), issues };
  }));
  if (result.ok && result.data) revalidateListingPaths(propertyId, result.data.id);
  return result;
}

export async function saveListingCover(propertyId: string, input: unknown) {
  if (!uuid.safeParse(propertyId).success) return { ok: false as const, error: "Không tìm thấy dữ liệu." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const user = auth.data;
  const parsed = coverSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Ảnh bìa không hợp lệ." };

  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ contentRevision: number }>>`
      SELECT content_revision AS "contentRevision"
      FROM properties
      WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
      FOR UPDATE`;
    if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    if (locked[0].contentRevision !== parsed.data.expectedRevision) {
      throw new ActionError("CONFLICT", "Thông tin bất động sản đã thay đổi. Tải lại trang trước khi chọn ảnh bìa.");
    }

    const current = await tx.listing.findFirst({ where: { propertyId, archivedAt: null } });
    if (parsed.data.listingId ? current?.id !== parsed.data.listingId : Boolean(current)) {
      throw new ActionError("CONFLICT", "Tin đăng đã thay đổi. Tải lại trang trước khi chọn ảnh bìa.");
    }
    const cover = await tx.propertyMedia.findFirst({
      where: { id: parsed.data.coverMediaId, propertyId, unitId: null, deletedAt: null, purgedAt: null, isSelectedForListing: true },
      select: { id: true },
    });
    if (!cover) throw new ActionError("CONFLICT", "Ảnh bìa phải là ảnh dùng chung đã chọn của bất động sản.");

    if (current?.coverMediaId === cover.id) {
      return { id: current.id, contentRevision: locked[0].contentRevision };
    }
    const listing = current
      ? await tx.listing.update({ where: { id: current.id }, data: { coverMediaId: cover.id } })
      : await tx.listing.create({ data: { propertyId, title: "", description: "", coverMediaId: cover.id } });
    await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
    if (current?.moderationStatus === "PENDING") {
      const admins = await tx.userProfile.findMany({
        where: { isAdmin: true, accountStatus: "ACTIVE" },
        select: { id: true },
      });
      const eventKey = `listing-updated-during-review:${current.id}:${randomUUID()}`;
      for (const admin of admins) {
        await createNotification(tx, {
          recipientId: admin.id,
          audience: "ADMIN",
          eventKey,
          title: "Tin đăng đang duyệt đã thay đổi",
          body: `Tin “${listing.title || "Chưa đặt tiêu đề"}” đã được chủ nhà cập nhật. Vui lòng xem lại nội dung mới nhất.`,
          link: { resourceType: "listing", resourceId: listing.id },
        });
      }
    }
    return { id: listing.id, contentRevision: locked[0].contentRevision + 1 };
  }));

  if (result.ok && result.data) revalidateListingPaths(propertyId, result.data.id);
  return result;
}

export async function submitListing(listingId: string) {
  if (!uuid.safeParse(listingId).success) return { ok: false as const, error: "Không tìm thấy tin đăng." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const user = auth.data;

  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; contentRevision: number }>>`
      SELECT p.id, p.content_revision AS "contentRevision"
      FROM properties p JOIN listings l ON l.property_id = p.id
      WHERE l.id = ${listingId}::uuid AND p.owner_id = ${user.profileId}::uuid
        AND p.archived_at IS NULL AND l.archived_at IS NULL
      FOR UPDATE OF p`;
    const property = rows[0];
    if (!property) throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");

    const listing = await tx.listing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.moderationStatus !== "DRAFT" && listing.moderationStatus !== "REJECTED") {
      throw new ActionError("CONFLICT", "Tin đăng chỉ có thể gửi duyệt khi đang là bản nháp hoặc đã bị từ chối.");
    }
    const issues = await getCompleteness(tx, listing.propertyId, listing);
    if (issues.length > 0) throw new ActionError("CONFLICT", issuesAsMessage(issues));

    const submitted = await tx.listing.update({
      where: { id: listingId },
      data: {
        moderationStatus: "PENDING",
        submittedAt: new Date(),
        submittedContentRevision: property.contentRevision,
        reviewReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    const admins = await tx.userProfile.findMany({ where: { isAdmin: true, accountStatus: "ACTIVE" }, select: { id: true } });
    if (admins.length === 0) throw new ActionError("CONFLICT", "Chưa có quản trị viên đang hoạt động để nhận yêu cầu xét duyệt.");
    const eventKey = `listing-submitted:${submitted.id}:${randomUUID()}`;
    for (const admin of admins) {
      await createNotification(tx, {
        recipientId: admin.id,
        audience: "ADMIN",
        eventKey,
        title: "Tin đăng cần duyệt",
        body: `Tin “${submitted.title || "Chưa đặt tiêu đề"}” đã được gửi để xét duyệt.`,
        link: { resourceType: "listing", resourceId: submitted.id },
      });
    }
    return { propertyId: listing.propertyId };
  }));
  if (result.ok && result.data) revalidateListingPaths(result.data.propertyId, listingId);
  return result;
}

export async function withdrawListing(listingId: string) {
  if (!uuid.safeParse(listingId).success) return { ok: false as const, error: "Không tìm thấy tin đăng." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const user = auth.data;

  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ propertyId: string }>>`
      SELECT p.id AS "propertyId"
      FROM properties p JOIN listings l ON l.property_id = p.id
      WHERE l.id = ${listingId}::uuid AND p.owner_id = ${user.profileId}::uuid
        AND p.archived_at IS NULL AND l.archived_at IS NULL
      FOR UPDATE OF p`;
    if (!rows[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");

    const listing = await tx.listing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.moderationStatus !== "PENDING") {
      throw new ActionError("CONFLICT", "Chỉ có thể rút tin đăng đang chờ xét duyệt.");
    }
    await tx.listing.update({
      where: { id: listingId },
      data: {
        moderationStatus: "DRAFT",
        submittedAt: null,
        submittedContentRevision: null,
        reviewedById: null,
        reviewedAt: null,
        reviewReason: null,
      },
    });
    return { propertyId: rows[0].propertyId };
  }));
  if (result.ok && result.data) revalidateListingPaths(result.data.propertyId, listingId);
  return result;
}

export async function publishListing(listingId: string) {
  if (!uuid.safeParse(listingId).success) return { ok: false as const, error: "Không tìm thấy tin đăng." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const user = auth.data;

  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ propertyId: string }>>`
      SELECT p.id AS "propertyId" FROM properties p JOIN listings l ON l.property_id = p.id
      WHERE l.id = ${listingId}::uuid AND p.owner_id = ${user.profileId}::uuid
        AND p.archived_at IS NULL AND l.archived_at IS NULL
      FOR UPDATE OF p`;
    const property = rows[0];
    if (!property) throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");
    const listing = await tx.listing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.moderationStatus !== "APPROVED") throw new ActionError("CONFLICT", "Tin đăng cần được duyệt trước khi công khai.");
    if (listing.adminSuspendedAt) throw new ActionError("CONFLICT", "Tin đăng đang bị đình chỉ bởi quản trị viên.");
    const issues = await getCompleteness(tx, property.propertyId, listing);
    if (issues.length > 0) throw new ActionError("CONFLICT", issuesAsMessage(issues));

    const today = todayInVietnam();
    const availableUnits = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT u.id FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.property_id = ${property.propertyId}::uuid
        AND ${publicPropertyContentSql()}
        AND ${marketedUnitSql()}
        AND NOT EXISTS (
          SELECT 1 FROM tenancies t
          WHERE t.unit_id = u.id AND t.status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE')
            AND t.blocked_start_date IS NOT NULL AND t.blocked_end_date IS NOT NULL
            AND daterange(t.blocked_start_date, t.blocked_end_date + 1, '[)') && daterange(
              ${today}::date,
              (${today}::date + make_interval(months => u.minimum_rental_months))::date,
              '[)'
            )
        )
      LIMIT 1`;
    if (availableUnits.length === 0) {
      throw new ActionError("CONFLICT", "Cần ít nhất một căn/phòng sẵn sàng, đang quảng bá và còn trống trong thời hạn thuê tối thiểu.");
    }
    await tx.listing.update({ where: { id: listingId }, data: { publicationStatus: "PUBLISHED" } });
    return { propertyId: property.propertyId };
  }));
  if (result.ok && result.data) revalidateListingPaths(result.data.propertyId, listingId);
  return result;
}

async function changePublication(listingId: string, operation: "hide" | "archive") {
  if (!uuid.safeParse(listingId).success) return { ok: false as const, error: "Không tìm thấy tin đăng." };
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Vui lòng đăng nhập lại." };
  const user = auth.data;
  const result = await runAction(async () => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ propertyId: string }>>`
      SELECT p.id AS "propertyId" FROM properties p JOIN listings l ON l.property_id = p.id
      WHERE l.id = ${listingId}::uuid AND p.owner_id = ${user.profileId}::uuid AND l.archived_at IS NULL
      FOR UPDATE OF p`;
    if (!rows[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");
    const data = operation === "archive"
      ? { archivedAt: new Date(), publicationStatus: "HIDDEN" }
      : { publicationStatus: "HIDDEN" };
    await tx.listing.update({ where: { id: listingId }, data });
    return { propertyId: rows[0].propertyId };
  }));
  if (result.ok && result.data) revalidateListingPaths(result.data.propertyId, listingId);
  return result;
}

export async function hideListing(listingId: string) {
  return changePublication(listingId, "hide");
}

export async function archiveListing(listingId: string) {
  return changePublication(listingId, "archive");
}
