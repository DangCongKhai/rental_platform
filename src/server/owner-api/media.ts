import {
  removePhoto,
  setSharedPhotoForUnit,
  updateGallery,
  uploadPhoto,
} from "@/app/owner/properties/actions/media-actions";
import { getMyProperty } from "@/server/properties";
import { getPropertyMedia } from "@/server/property-media";
import {
  OwnerApiError,
  actionData,
  asObject,
  camelize,
  readJsonObject,
  toOwnerMedia,
} from "./shared";

function uploadFile(value: FormDataEntryValue | null): File | null {
  if (value == null || typeof value === "string") return null;
  if (typeof File !== "undefined" && value instanceof File) return value;
  if (value instanceof Blob) {
    const name =
      "name" in value && typeof value.name === "string"
        ? value.name
        : "upload";
    return new File([value], name, {
      type: value.type || "application/octet-stream",
    });
  }
  return null;
}

export async function getOwnerMediaResponse(propertyId: string) {
  const media = await getPropertyMedia(propertyId);
  return Response.json(
    media.map((item) => toOwnerMedia(propertyId, item)),
  );
}

export async function uploadOwnerMediaResponse(
  request: Request,
  propertyId: string,
) {
  const input = await request.formData();
  const rawPhoto = input.get("photo");
  const photo = uploadFile(rawPhoto);
  if (!photo) {
    const kind =
      rawPhoto == null
        ? "missing"
        : typeof rawPhoto === "string"
          ? "string"
          : rawPhoto.constructor.name;
    console.error(
      "Photo upload had no file.",
      request.headers.get("content-type"),
      kind,
    );
    throw new OwnerApiError("Chọn một tệp ảnh trước khi tải lên.", 422);
  }
  const formData = new FormData();
  formData.set("file", photo);
  const unitId = input.get("unit_id");
  if (typeof unitId === "string" && unitId) {
    formData.set("unitId", unitId);
  }
  const media = actionData(await uploadPhoto(propertyId, formData));
  const property = await getMyProperty(propertyId);
  return Response.json({
    media: toOwnerMedia(propertyId, media),
    content_revision: property?.contentRevision ?? 1,
  });
}

export async function removeOwnerMediaResponse(
  propertyId: string,
  mediaId: string,
) {
  actionData(await removePhoto(propertyId, mediaId));
  return Response.json({ id: mediaId });
}

function galleryItems(
  value: unknown,
  media: Awaited<ReturnType<typeof getPropertyMedia>>,
) {
  if (!Array.isArray(value)) return [];
  return value.map((rawItem) => {
    const item = asObject(camelize(rawItem));
    const id = typeof item.mediaId === "string" ? item.mediaId : "";
    const current = media.find((photo) => photo.id === id);
    return {
      id,
      caption: current?.caption ?? null,
      sortOrder:
        typeof item.sortOrder === "number" ? item.sortOrder : 0,
      isSelectedForListing: item.isSelectedForListing === true,
    };
  });
}

export async function updateOwnerGalleryResponse(
  request: Request,
  propertyId: string,
  unitId?: string,
) {
  const body = asObject(camelize(await readJsonObject(request)));
  const media = await getPropertyMedia(propertyId);
  actionData(
    await updateGallery(
      propertyId,
      { items: galleryItems(body.items, media) },
      unitId,
    ),
  );
  const updated = await getPropertyMedia(propertyId);
  return Response.json(
    updated.map((item) => toOwnerMedia(propertyId, item)),
  );
}

export async function updateOwnerSharedMediaResponse(
  request: Request,
  propertyId: string,
  unitId: string,
) {
  const body = await readJsonObject(request);
  const desiredIds = new Set(
    Array.isArray(body.media_ids)
      ? body.media_ids.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const media = await getPropertyMedia(propertyId);
  for (const photo of media.filter((item) => item.unitId === null)) {
    const included = desiredIds.has(photo.id);
    const saved = photo.assignedUnitIds.includes(unitId);
    if (included !== saved) {
      actionData(
        await setSharedPhotoForUnit(
          propertyId,
          unitId,
          photo.id,
          included,
        ),
      );
    }
  }
  const property = await getMyProperty(propertyId);
  return Response.json({
    content_revision: property?.contentRevision ?? 1,
  });
}
