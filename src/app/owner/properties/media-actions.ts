"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, runAction } from "@/server/action";
import { requireOwner } from "@/server/auth";
import { prisma } from "@/server/db";
import { createMediaSignedUrls, removeMediaObject, uploadMediaObject } from "@/server/media-storage";
import {
  MAX_PHOTOS_PER_PROPERTY,
  validatePhotoBytes,
} from "@/server/media-validation";
import type { ActionResult } from "@/server/validation";

const propertyIdSchema = z.string().uuid();
const unitIdSchema = z.string().uuid();
const mediaIdSchema = z.string().uuid();
const gallerySchema = z.object({
  items: z.array(z.object({
    id: mediaIdSchema,
    caption: z.string().trim().max(240).nullable(),
    sortOrder: z.number().int().min(0),
    isSelectedForListing: z.boolean(),
  }).strict()).min(1).max(MAX_PHOTOS_PER_PROPERTY),
  coverMediaId: mediaIdSchema.nullable().optional(),
}).strict();

type UploadedPhoto = {
  id: string;
  unitId: string | null;
  caption: string | null;
  sortOrder: number;
  isSelectedForListing: boolean;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
  assignedUnitIds: string[];
};

function failed<T>(error: string): ActionResult<T> {
  return { ok: false, error };
}

export async function uploadPhoto(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult<UploadedPhoto>> {
  return storePhoto(propertyId, formData);
}

export async function setSharedPhotoForUnit(
  propertyId: string,
  unitId: string,
  mediaId: string,
  included: boolean,
): Promise<ActionResult<{ included: boolean }>> {
  if (typeof included !== "boolean") return failed("Trạng thái chọn ảnh không hợp lệ.");
  if (
    !propertyIdSchema.safeParse(propertyId).success ||
    !unitIdSchema.safeParse(unitId).success ||
    !mediaIdSchema.safeParse(mediaId).success
  ) return failed("Không tìm thấy dữ liệu.");

  const auth = await runAction(() => requireOwner(propertyId));
  if (!auth.ok) return auth;
  const user = auth.data;
  if (!user) return failed("Vui lòng đăng nhập lại.");

  return runAction(async () => {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ contentRevision: number }>>`
        SELECT content_revision AS "contentRevision" FROM properties
        WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
        FOR UPDATE`;
      if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

      const [unit, media, assignment] = await Promise.all([
        tx.unit.findFirst({ where: { id: unitId, propertyId, archivedAt: null }, select: { id: true } }),
        tx.propertyMedia.findFirst({ where: { id: mediaId, propertyId, unitId: null, deletedAt: null }, select: { id: true } }),
        tx.unitMedia.findUnique({ where: { unitId_mediaId: { unitId, mediaId } } }),
      ]);
      if (!unit) throw new ActionError("NOT_FOUND", "Căn/phòng không thuộc bất động sản này.");
      if (!media) throw new ActionError("NOT_FOUND", "Chỉ có thể chọn ảnh dùng chung của bất động sản.");

      const changed = included ? !assignment : Boolean(assignment);
      if (!changed) return { included, contentRevision: locked[0].contentRevision };

      if (included) {
        const [assignedCount, directPhotoCount] = await Promise.all([
          tx.unitMedia.count({ where: { unitId } }),
          tx.propertyMedia.count({ where: { propertyId, unitId, deletedAt: null } }),
        ]);
        if (assignedCount + directPhotoCount >= MAX_PHOTOS_PER_PROPERTY) {
          throw new ActionError("CONFLICT", `Mỗi căn/phòng được hiển thị tối đa ${MAX_PHOTOS_PER_PROPERTY} ảnh.`);
        }
        await tx.unitMedia.create({
          data: {
            unitId,
            mediaId,
            sortOrder: assignedCount + directPhotoCount,
            isSelectedForListing: true,
          },
        });
      } else {
        await tx.unitMedia.delete({ where: { unitId_mediaId: { unitId, mediaId } } });
      }

      await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
      return { included, contentRevision: locked[0].contentRevision + 1 };
    });

    revalidatePath(`/owner/properties/${propertyId}/media`);
    revalidatePath(`/owner/properties/${propertyId}/units`);
    revalidatePath("/owner/properties");
    return { included: result.included };
  });
}

export async function setAllSharedPhotosForUnit(
  propertyId: string,
  unitId: string,
  included: boolean,
): Promise<ActionResult<{ included: boolean; mediaIds: string[] }>> {
  if (typeof included !== "boolean") return failed("Trạng thái chọn ảnh không hợp lệ.");
  if (!propertyIdSchema.safeParse(propertyId).success || !unitIdSchema.safeParse(unitId).success) {
    return failed("Không tìm thấy dữ liệu.");
  }

  const auth = await runAction(() => requireOwner(propertyId));
  if (!auth.ok) return auth;
  const user = auth.data;
  if (!user) return failed("Vui lòng đăng nhập lại.");

  return runAction(async () => {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM properties
        WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
        FOR UPDATE`;
      if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

      const unit = await tx.unit.findFirst({ where: { id: unitId, propertyId, archivedAt: null }, select: { id: true } });
      if (!unit) throw new ActionError("NOT_FOUND", "Căn/phòng không thuộc bất động sản này.");

      const sharedPhotos = await tx.propertyMedia.findMany({
        where: { propertyId, unitId: null, deletedAt: null },
        select: { id: true },
      });
      const mediaIds = sharedPhotos.map((photo) => photo.id);
      const existing = await tx.unitMedia.findMany({
        where: { unitId, mediaId: { in: mediaIds } },
        select: { mediaId: true },
      });
      const existingIds = new Set(existing.map((assignment) => assignment.mediaId));
      const missingIds = mediaIds.filter((id) => !existingIds.has(id));

      if (included && missingIds.length > 0) {
        const directPhotoCount = await tx.propertyMedia.count({ where: { propertyId, unitId, deletedAt: null } });
        if (existing.length + directPhotoCount + missingIds.length > MAX_PHOTOS_PER_PROPERTY) {
          throw new ActionError("CONFLICT", `Mỗi căn/phòng được hiển thị tối đa ${MAX_PHOTOS_PER_PROPERTY} ảnh.`);
        }
        await tx.unitMedia.createMany({
          data: missingIds.map((mediaId, index) => ({
            unitId,
            mediaId,
            sortOrder: existing.length + directPhotoCount + index,
            isSelectedForListing: true,
          })),
        });
      } else if (!included && existing.length > 0) {
        await tx.unitMedia.deleteMany({ where: { unitId, mediaId: { in: [...existingIds] } } });
      }

      const changed = included ? missingIds.length > 0 : existing.length > 0;
      if (changed) await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
      return { mediaIds, included };
    });

    revalidatePath(`/owner/properties/${propertyId}/media`);
    revalidatePath(`/owner/properties/${propertyId}/units`);
    revalidatePath("/owner/properties");
    return result;
  });
}

export async function replacePhoto(
  propertyId: string,
  mediaId: string,
  formData: FormData,
): Promise<ActionResult<UploadedPhoto>> {
  if (!mediaIdSchema.safeParse(mediaId).success) return failed("Không tìm thấy dữ liệu.");
  return storePhoto(propertyId, formData, mediaId);
}

async function storePhoto(
  propertyId: string,
  formData: FormData,
  replaceMediaId?: string,
): Promise<ActionResult<UploadedPhoto>> {
  const parsedPropertyId = propertyIdSchema.safeParse(propertyId);
  if (!parsedPropertyId.success) return failed("Không tìm thấy dữ liệu.");

  const auth = await runAction(() => requireOwner(propertyId));
  if (!auth.ok) return auth;
  const user = auth.data;
  if (!user) return failed("Vui lòng đăng nhập lại.");

  const file = formData.get("file");
  const oldMedia = replaceMediaId
    ? await prisma.propertyMedia.findFirst({
        where: { id: replaceMediaId, propertyId, deletedAt: null },
      })
    : null;
  if (replaceMediaId && !oldMedia) return failed("Không tìm thấy ảnh cần thay.");

  const rawUnitId = formData.get("unitId");
  const unitId = oldMedia
    ? oldMedia.unitId
    : typeof rawUnitId === "string" && rawUnitId.trim()
      ? rawUnitId
      : null;
  if (unitId && !unitIdSchema.safeParse(unitId).success) {
    return failed("Căn/phòng không hợp lệ.");
  }
  if (typeof File === "undefined" || !(file instanceof File)) {
    return failed("Chọn một tệp ảnh trước khi tải lên.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = await validatePhotoBytes(bytes, file.type);
  if (!validation.ok) return failed(validation.error);

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: user.profileId, archivedAt: null },
    select: { id: true },
  });
  if (!property) return failed("Không tìm thấy dữ liệu.");

  if (unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, propertyId, archivedAt: null },
      select: { id: true },
    });
    if (!unit) return failed("Căn/phòng không thuộc bất động sản này.");
  }

  const currentCount = await prisma.propertyMedia.count({
    where: { propertyId, deletedAt: null, ...(replaceMediaId && { id: { not: replaceMediaId } }) },
  });
  if (currentCount >= MAX_PHOTOS_PER_PROPERTY) {
    return failed(`Mỗi bất động sản được quản lý tối đa ${MAX_PHOTOS_PER_PROPERTY} ảnh đang sử dụng.`);
  }

  const extension = validation.mimeType === "image/jpeg" ? "jpg" : validation.mimeType.slice("image/".length);
  const scopePath = unitId ? `units/${unitId}` : "property";
  const storagePath = `${propertyId}/${scopePath}/${randomUUID()}.${extension}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  return runAction(async () => {
    try {
      await uploadMediaObject(storagePath, bytes, validation.mimeType);
    } catch {
      throw new ActionError("STORAGE", "Không thể tải ảnh lên bộ nhớ. Hãy thử lại sau.");
    }

    let media;
    try {
      media = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM properties
          WHERE id = ${propertyId}::uuid
            AND owner_id = ${user.profileId}::uuid
            AND archived_at IS NULL
          FOR UPDATE`;
        if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

        if (unitId) {
          const matchingUnit = await tx.unit.findFirst({
            where: { id: unitId, propertyId, archivedAt: null },
            select: { id: true },
          });
          if (!matchingUnit) throw new ActionError("NOT_FOUND", "Căn/phòng không thuộc bất động sản này.");
        }

        const activeCount = await tx.propertyMedia.count({
          where: { propertyId, deletedAt: null, ...(replaceMediaId && { id: { not: replaceMediaId } }) },
        });
        if (activeCount >= MAX_PHOTOS_PER_PROPERTY) {
          throw new ActionError("CONFLICT", `Mỗi bất động sản được quản lý tối đa ${MAX_PHOTOS_PER_PROPERTY} ảnh đang sử dụng.`);
        }

        const currentMedia = replaceMediaId
          ? await tx.propertyMedia.findFirst({ where: { id: replaceMediaId, propertyId, deletedAt: null } })
          : null;
        if (replaceMediaId && !currentMedia) {
          throw new ActionError("CONFLICT", "Ảnh cần thay đã được cập nhật ở nơi khác. Hãy tải lại trang.");
        }
        const referencedListings = replaceMediaId
          ? await tx.listing.findMany({
              where: { propertyId, coverMediaId: replaceMediaId, archivedAt: null },
              select: { id: true },
            })
          : [];
        const currentUnitAssignments = currentMedia?.unitId === null
          ? await tx.unitMedia.findMany({
              where: { mediaId: currentMedia.id },
              select: { unitId: true, sortOrder: true, isSelectedForListing: true },
            })
          : [];
        if (referencedListings.length > 0 && unitId !== null) {
          throw new ActionError("CONFLICT", "Ảnh bìa phải thuộc phạm vi bất động sản, không phải một căn riêng.");
        }

        const created = await tx.propertyMedia.create({
          data: {
            propertyId,
            unitId,
            uploadedById: user.profileId,
            storagePath,
            caption: currentMedia?.caption,
            sortOrder: currentMedia?.sortOrder ?? activeCount,
            isSelectedForListing: currentMedia
              ? currentMedia.isSelectedForListing || referencedListings.length > 0
              : true,
            sha256,
            mimeType: validation.mimeType,
            sizeBytes: BigInt(bytes.byteLength),
          },
        });
        if (currentMedia) {
          if (currentUnitAssignments.length > 0) {
            await tx.unitMedia.createMany({
              data: currentUnitAssignments.map((assignment) => ({
                ...assignment,
                mediaId: created.id,
              })),
            });
            await tx.unitMedia.deleteMany({ where: { mediaId: currentMedia.id } });
          }
          if (referencedListings.length > 0) {
            await tx.listing.updateMany({
              where: { propertyId, coverMediaId: currentMedia.id, archivedAt: null },
              data: { coverMediaId: created.id },
            });
          }
          await tx.propertyMedia.update({
            where: { id: currentMedia.id },
            data: { deletedAt: new Date(), isSelectedForListing: false },
          });
        }
        await tx.property.update({
          where: { id: propertyId },
          data: { contentRevision: { increment: 1 } },
        });
        return created;
      });

    } catch (error) {
      try {
        await removeMediaObject(storagePath);
      } catch {
        // A failed cleanup must not hide the original DB or storage error.
      }
      throw error;
    }

    let signedUrl: string | null = null;
    try {
      [signedUrl] = await createMediaSignedUrls([media.storagePath]);
    } catch {
      // The stored image remains valid; the media page can retry signing it.
    }
    const unitAssignments = await prisma.unitMedia.findMany({ where: { mediaId: media.id }, select: { unitId: true } });
    revalidatePath(`/owner/properties/${propertyId}/media`);
    return {
      id: media.id,
      unitId: media.unitId,
      caption: media.caption,
      sortOrder: media.sortOrder,
      isSelectedForListing: media.isSelectedForListing,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      signedUrl,
      assignedUnitIds: unitAssignments.map((assignment) => assignment.unitId),
    };
  });
}

export async function updateGallery(propertyId: string, input: unknown, unitId?: string): Promise<ActionResult<{ contentRevision: number }>> {
  if (!propertyIdSchema.safeParse(propertyId).success) return failed("Không tìm thấy dữ liệu.");
  if (unitId && !unitIdSchema.safeParse(unitId).success) return failed("Căn/phòng không hợp lệ.");
  const auth = await runAction(() => requireOwner(propertyId));
  if (!auth.ok) return auth;
  const user = auth.data;
  if (!user) return failed("Vui lòng đăng nhập lại.");

  const parsed = gallerySchema.safeParse(input);
  if (!parsed.success) return failed("Thông tin thư viện ảnh không hợp lệ.");
  const ids = parsed.data.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length || new Set(parsed.data.items.map((item) => item.sortOrder)).size !== ids.length) {
    return failed("Mỗi ảnh cần có thứ tự riêng và không được lặp lại.");
  }

  return runAction(async () => {
    const revision = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ contentRevision: number }>>`
        SELECT content_revision AS "contentRevision" FROM properties
        WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
        FOR UPDATE`;
      if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

      if (unitId) {
        const unit = await tx.unit.findFirst({ where: { id: unitId, propertyId, archivedAt: null }, select: { id: true } });
        if (!unit) throw new ActionError("NOT_FOUND", "Căn/phòng không thuộc bất động sản này.");

        const existingUnitPhotos = await tx.propertyMedia.findMany({
          where: { propertyId, unitId, deletedAt: null },
          select: { id: true, caption: true, sortOrder: true, isSelectedForListing: true },
        });
        if (existingUnitPhotos.length !== parsed.data.items.length || existingUnitPhotos.some((item) => !ids.includes(item.id))) {
          throw new ActionError("CONFLICT", "Thư viện ảnh của căn/phòng đã thay đổi. Hãy tải lại trang trước khi lưu.");
        }

        const desiredUnitPhotos = new Map(parsed.data.items.map((item) => [item.id, item]));
        const changedUnitPhotos = existingUnitPhotos.some((item) => {
          const next = desiredUnitPhotos.get(item.id)!;
          return item.caption !== next.caption || item.sortOrder !== next.sortOrder || item.isSelectedForListing !== next.isSelectedForListing;
        });
        for (const item of parsed.data.items) {
          await tx.propertyMedia.update({
            where: { id: item.id },
            data: { caption: item.caption || null, sortOrder: item.sortOrder, isSelectedForListing: item.isSelectedForListing },
          });
        }
        if (changedUnitPhotos) {
          await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
        }
        return locked[0].contentRevision + (changedUnitPhotos ? 1 : 0);
      }

      const existing = await tx.propertyMedia.findMany({
        where: { propertyId, unitId: null, deletedAt: null },
        select: { id: true, unitId: true, caption: true, sortOrder: true, isSelectedForListing: true },
      });
      if (existing.length !== parsed.data.items.length || existing.some((item) => !ids.includes(item.id))) {
        throw new ActionError("CONFLICT", "Thư viện ảnh đã thay đổi. Hãy tải lại trang trước khi lưu.");
      }

      const desired = new Map(parsed.data.items.map((item) => [item.id, item]));
      const selectedPropertyPhotoIds = new Set(
        parsed.data.items.filter((item) => item.isSelectedForListing).map((item) => item.id),
      );
      const coverMediaId = parsed.data.coverMediaId;
      if (coverMediaId) {
        const cover = existing.find((item) => item.id === coverMediaId);
        if (!cover || cover.unitId || !selectedPropertyPhotoIds.has(coverMediaId)) {
          throw new ActionError("CONFLICT", "Ảnh bìa phải là ảnh bất động sản đang được chọn.");
        }
      }

      const listings = await tx.listing.findMany({
        where: { propertyId, archivedAt: null },
        select: { id: true, coverMediaId: true, publicationStatus: true },
      });
      for (const listing of listings) {
        const candidate = coverMediaId === undefined ? listing.coverMediaId : coverMediaId;
        if (candidate && (!selectedPropertyPhotoIds.has(candidate) || !existing.some((item) => item.id === candidate && item.unitId === null))) {
          throw new ActionError("CONFLICT", "Ảnh bìa phải là ảnh bất động sản đang được chọn. Hãy chọn ảnh bìa mới trước khi bỏ chọn ảnh hiện tại.");
        }
        if (listing.publicationStatus === "PUBLISHED" && !candidate) {
          throw new ActionError("CONFLICT", "Tin đang công khai cần một ảnh bìa bất động sản đang được chọn. Hãy chọn ảnh bìa mới trước khi bỏ chọn ảnh hiện tại.");
        }
      }

      const changed = existing.some((item) => {
        const next = desired.get(item.id)!;
        return item.caption !== next.caption || item.sortOrder !== next.sortOrder || item.isSelectedForListing !== next.isSelectedForListing;
      }) || (coverMediaId !== undefined && listings.some((listing) => listing.coverMediaId !== coverMediaId));

      for (const item of parsed.data.items) {
        await tx.propertyMedia.update({
          where: { id: item.id },
          data: { caption: item.caption || null, sortOrder: item.sortOrder, isSelectedForListing: item.isSelectedForListing },
        });
      }
      if (coverMediaId !== undefined) {
        await tx.listing.updateMany({ where: { propertyId, archivedAt: null }, data: { coverMediaId } });
      }
      if (changed) {
        await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
      }
      return locked[0].contentRevision + (changed ? 1 : 0);
    });

    revalidatePath(`/owner/properties/${propertyId}/media`);
    revalidatePath("/owner/properties");
    return { contentRevision: revision };
  });
}

export async function removePhoto(
  propertyId: string,
  mediaId: string,
  replacementCoverId?: string | null,
): Promise<ActionResult<{ removed: true }>> {
  if (!propertyIdSchema.safeParse(propertyId).success || !mediaIdSchema.safeParse(mediaId).success) {
    return failed("Không tìm thấy dữ liệu.");
  }
  if (replacementCoverId && !mediaIdSchema.safeParse(replacementCoverId).success) {
    return failed("Ảnh bìa thay thế không hợp lệ.");
  }
  const auth = await runAction(() => requireOwner(propertyId));
  if (!auth.ok) return auth;
  const user = auth.data;
  if (!user) return failed("Vui lòng đăng nhập lại.");

  return runAction(async () => {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM properties
        WHERE id = ${propertyId}::uuid AND owner_id = ${user.profileId}::uuid AND archived_at IS NULL
        FOR UPDATE`;
      if (!locked[0]) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

      const media = await tx.propertyMedia.findFirst({ where: { id: mediaId, propertyId, deletedAt: null } });
      if (!media) throw new ActionError("NOT_FOUND", "Không tìm thấy ảnh cần xóa.");
      if (media.unitId === null) {
        const unitAssignments = await tx.unitMedia.count({ where: { mediaId } });
        if (unitAssignments > 0) {
          throw new ActionError("CONFLICT", "Ảnh này đang được dùng trong căn/phòng. Hãy gỡ ảnh khỏi các căn/phòng trước khi lưu trữ ảnh dùng chung.");
        }
      }
      const affectedListings = await tx.listing.findMany({
        where: { propertyId, coverMediaId: mediaId, archivedAt: null },
        select: { id: true, publicationStatus: true },
      });
      if (affectedListings.some((listing) => listing.publicationStatus === "PUBLISHED") && !replacementCoverId) {
        throw new ActionError("CONFLICT", "Ảnh này đang làm ảnh bìa của tin công khai. Hãy chọn ảnh bìa thay thế trước khi xóa.");
      }

      if (replacementCoverId) {
        const cover = await tx.propertyMedia.findFirst({
          where: { id: replacementCoverId, propertyId, unitId: null, deletedAt: null, isSelectedForListing: true },
          select: { id: true },
        });
        if (!cover || cover.id === media.id) throw new ActionError("CONFLICT", "Chọn một ảnh bìa khác đang được hiển thị.");
      }

      if (affectedListings.length > 0) {
        await tx.listing.updateMany({
          where: { propertyId, coverMediaId: mediaId, archivedAt: null },
          data: { coverMediaId: replacementCoverId ?? null },
        });
      }
      await tx.propertyMedia.update({
        where: { id: mediaId },
        data: { deletedAt: new Date(), isSelectedForListing: false },
      });
      await tx.property.update({ where: { id: propertyId }, data: { contentRevision: { increment: 1 } } });
    });

    revalidatePath(`/owner/properties/${propertyId}/media`);
    revalidatePath("/owner/properties");
    return { removed: true as const };
  });
}
