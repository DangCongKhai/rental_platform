import {
  archiveListing,
  hideListing,
  publishListing,
  saveListing,
  submitListing,
} from "@/server/listings/owner-listing-actions";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getMyProperty } from "@/server/properties";
import {
  OwnerApiError,
  actionData,
  asObject,
  camelize,
  readJsonObject,
  toOwnerListing,
} from "./shared";

async function listingForProperty(propertyId: string) {
  const user = await requireUser();
  return prisma.listing.findFirst({
    where: {
      propertyId,
      archivedAt: null,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    orderBy: { updatedAt: "desc" },
    include: { property: { select: { contentRevision: true } } },
  });
}

export async function getOwnerListingResponse(propertyId: string) {
  const listing = await listingForProperty(propertyId);
  if (!listing) throw new OwnerApiError("Chưa có tin đăng.", 404);
  return Response.json(toOwnerListing(listing));
}

export async function getOwnerListingByIdResponse(listingId: string) {
  const user = await requireUser();
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    include: { property: { select: { contentRevision: true } } },
  });
  if (!listing) {
    throw new OwnerApiError("Không tìm thấy tin đăng.", 404);
  }
  return Response.json(toOwnerListing(listing));
}

export async function saveOwnerListingResponse(
  request: Request,
  propertyId: string,
) {
  const property = await getMyProperty(propertyId);
  if (!property) {
    throw new OwnerApiError("Không tìm thấy bất động sản.", 404);
  }
  const input = asObject(camelize(await readJsonObject(request)));
  const listing = await listingForProperty(propertyId);
  actionData(
    await saveListing(propertyId, {
      listingId: listing?.id ?? null,
      expectedRevision: property.contentRevision,
      title: input.title ?? "",
      description: input.description ?? "",
      coverMediaId: input.coverMediaId ?? null,
      marketedUnitIds: property.units
        .filter(
          (unit) =>
            property.rentalArrangement === "WHOLE_SPACE" ||
            unit.isMarketed,
        )
        .map((unit) => unit.id),
    }),
  );
  const saved = await listingForProperty(propertyId);
  if (!saved) {
    throw new OwnerApiError("Không thể tải tin đăng vừa lưu.", 500);
  }
  return Response.json(toOwnerListing(saved));
}

export type OwnerListingAction =
  | "submit"
  | "publish"
  | "hide"
  | "archive";

export async function runOwnerListingAction(
  propertyId: string,
  action: OwnerListingAction,
) {
  const listing = await listingForProperty(propertyId);
  if (!listing) throw new OwnerApiError("Chưa có tin đăng.", 404);
  if (action === "submit") {
    actionData(await submitListing(listing.id));
  } else if (action === "publish") {
    actionData(await publishListing(listing.id));
  } else if (action === "hide") {
    actionData(await hideListing(listing.id));
  } else {
    actionData(await archiveListing(listing.id));
  }
  const saved = await listingForProperty(propertyId);
  return Response.json(
    saved ? toOwnerListing(saved) : toOwnerListing(listing),
  );
}
