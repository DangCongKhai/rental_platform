import { requireOwner } from "./auth";
import { prisma } from "./db";
import { createMediaSignedUrls } from "./media-storage";

export async function getPropertyMedia(propertyId: string) {
  const user = await requireOwner(propertyId);
  const media = await prisma.propertyMedia.findMany({
    where: {
      propertyId,
      property: { ownerId: user.profileId, archivedAt: null },
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      unitId: true,
      caption: true,
      sortOrder: true,
      isSelectedForListing: true,
      mimeType: true,
      sizeBytes: true,
      storagePath: true,
    },
  });

  let urls: Array<string | null>;
  try {
    urls = await createMediaSignedUrls(media.map((item) => item.storagePath));
  } catch {
    urls = media.map(() => null);
  }
  return media.map((item, index) => ({
    id: item.id,
    unitId: item.unitId,
    caption: item.caption,
    sortOrder: item.sortOrder,
    isSelectedForListing: item.isSelectedForListing,
    mimeType: item.mimeType,
    sizeBytes: Number(item.sizeBytes),
    signedUrl: urls[index],
  }));
}
