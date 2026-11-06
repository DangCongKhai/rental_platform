"use server";

import { unstable_rethrow } from "next/navigation";
import { getAmenityCatalog as loadAmenityCatalog } from "@/domain/amenities";
import type {
  AmenityCatalogEntry,
  OwnerListing,
  OwnerListingFilter,
  OwnerListingStatusFilter,
  OwnerOccupancyFilter,
  OwnerPropertyDetail,
  OwnerPropertyMedia,
  OwnerPropertyPage,
  OwnerUnit,
} from "@/lib/owner-types";
import {
  archiveOwnerPropertyResponse,
  archiveOwnerUnitResponse,
  createOwnerPropertyResponse,
  createOwnerUnitResponse,
  createOwnerUnitsResponse,
  getOwnerPropertyResponse,
  listOwnerProperties,
  updateOwnerPropertyResponse,
  updateOwnerUnitResponse,
} from "@/server/owner-api/properties";
import {
  getOwnerListingByIdResponse,
  getOwnerListingResponse,
  runOwnerListingAction,
  saveOwnerListingResponse,
} from "@/server/owner-api/listings";
import {
  getOwnerMediaResponse,
  removeOwnerMediaResponse,
  updateOwnerGalleryResponse,
  updateOwnerSharedMediaResponse,
  uploadOwnerMediaResponse,
} from "@/server/owner-api/media";
import { OwnerApiError } from "@/server/owner-api/shared";

function failure(error: OwnerApiError): never {
  const details = Object.entries(error.errors).flatMap(
    ([field, messages]) => messages.map((message) => `${field}: ${message}`),
  );
  throw new Error(
    details.length > 0 ? details.join("\n") : error.message,
  );
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof OwnerApiError) failure(error);
    throw error;
  }
}

async function read<T>(
  response: Response | Promise<Response>,
): Promise<T> {
  return (await response).json() as Promise<T>;
}

function jsonRequest(path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function getOwnerProperties(
  query: {
    page?: number;
    filter?: OwnerListingFilter;
    includeArchived?: boolean;
    occupancy?: OwnerOccupancyFilter;
    listingStatus?: OwnerListingStatusFilter;
  } = {},
): Promise<OwnerPropertyPage> {
  const params = new URLSearchParams();
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.filter && query.filter !== "all") {
    params.set("filter", query.filter);
  }
  if (query.includeArchived) params.set("include_archived", "1");
  if (query.occupancy && query.occupancy !== "all") {
    params.set("occupancy", query.occupancy);
  }
  if (query.listingStatus && query.listingStatus !== "all") {
    params.set("listing_status", query.listingStatus);
  }
  const text = params.toString();
  return run(() =>
    read(
      listOwnerProperties(
        jsonRequest(`/owner/properties${text ? `?${text}` : ""}`),
      ),
    ),
  );
}

function ownerAmenityScope(scope: string): string {
  if (scope === "PROPERTY") return "shared";
  if (scope === "UNIT") return "unit";
  return scope.toLowerCase();
}

export async function getAmenityCatalog(): Promise<AmenityCatalogEntry[]> {
  return loadAmenityCatalog().map((item) => ({
    key: item.key,
    label: item.label,
    label_vi: item.label,
    scopes: item.scopes.map(ownerAmenityScope),
  }));
}

export async function getOwnerProperty(
  propertyId: string,
): Promise<OwnerPropertyDetail> {
  return run(() => read(getOwnerPropertyResponse(propertyId)));
}

export async function getOwnerPropertyMedia(
  propertyId: string,
): Promise<OwnerPropertyMedia[]> {
  return run(() => read(getOwnerMediaResponse(propertyId)));
}

export async function getOwnerListingById(
  listingId: string,
): Promise<OwnerListing> {
  return run(() => read(getOwnerListingByIdResponse(listingId)));
}

export async function getOwnerListing(
  propertyId: string,
): Promise<OwnerListing | null> {
  try {
    return await read(getOwnerListingResponse(propertyId));
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof OwnerApiError && error.status === 404) return null;
    if (error instanceof OwnerApiError) failure(error);
    throw error;
  }
}

export async function createOwnerListing(
  propertyId: string,
  input: {
    client_operation_id: string;
    title: string;
    description: string;
    cover_media_id: string | null;
  },
): Promise<OwnerListing> {
  return run(() =>
    read(saveOwnerListingResponse(jsonRequest("/listing", input), propertyId)),
  );
}

export async function updateOwnerListing(
  propertyId: string,
  input: {
    expected_content_revision: number;
    title: string;
    description: string;
    cover_media_id: string | null;
  },
): Promise<OwnerListing> {
  return run(() =>
    read(saveOwnerListingResponse(jsonRequest("/listing", input), propertyId)),
  );
}

async function listingAction(
  propertyId: string,
  action: "submit" | "publish" | "hide" | "archive",
): Promise<OwnerListing> {
  return run(() => read(runOwnerListingAction(propertyId, action)));
}

export async function submitOwnerListing(
  propertyId: string,
  
): Promise<OwnerListing> {
  return listingAction(propertyId, "submit");
}

export async function publishOwnerListing(
  propertyId: string,
  
): Promise<OwnerListing> {
  return listingAction(propertyId, "publish");
}

export async function hideOwnerListing(
  propertyId: string,
  
): Promise<OwnerListing> {
  return listingAction(propertyId, "hide");
}

export async function archiveOwnerListing(
  propertyId: string,
  
): Promise<OwnerListing> {
  return listingAction(propertyId, "archive");
}

export async function createOwnerProperty(
  input: Record<string, unknown>,
): Promise<OwnerPropertyDetail> {
  return run(() =>
    read(createOwnerPropertyResponse(jsonRequest("/properties", input))),
  );
}

export async function updateOwnerProperty(
  propertyId: string,
  input: Record<string, unknown>,
): Promise<OwnerPropertyDetail> {
  return run(() =>
    read(
      updateOwnerPropertyResponse(
        jsonRequest("/properties", input),
        propertyId,
      ),
    ),
  );
}

export async function archiveOwnerProperty(
  propertyId: string,
  
): Promise<void> {
  await run(() => read(archiveOwnerPropertyResponse(propertyId)));
}

export async function createOwnerUnit(
  propertyId: string,
  input: Record<string, unknown>,
): Promise<OwnerUnit> {
  return run(() =>
    read(
      createOwnerUnitResponse(jsonRequest("/units", input), propertyId),
    ),
  );
}

export async function updateOwnerUnit(
  propertyId: string,
  unitId: string,
  input: Record<string, unknown>,
): Promise<OwnerUnit> {
  return run(() =>
    read(
      updateOwnerUnitResponse(
        jsonRequest("/units", input),
        propertyId,
        unitId,
      ),
    ),
  );
}

export async function archiveOwnerUnit(
  propertyId: string,
  unitId: string,
  
): Promise<void> {
  await run(() => read(archiveOwnerUnitResponse(propertyId, unitId)));
}

export async function createOwnerUnitBatch(
  propertyId: string,
  input: Record<string, unknown>,
): Promise<OwnerUnit[]> {
  return run(() =>
    read(
      createOwnerUnitsResponse(jsonRequest("/units/bulk", input), propertyId),
    ),
  );
}

export async function uploadOwnerMedia(
  propertyId: string,
  input: {
    file: File;
    client_operation_id?: string;
    expected_content_revision?: number;
    unit_id?: string;
    caption?: string;
  },
): Promise<{ media: OwnerPropertyMedia; content_revision: number }> {
  const body = new FormData();
  body.set("photo", input.file);
  if (input.unit_id) body.set("unit_id", input.unit_id);
  if (input.caption) body.set("caption", input.caption);
  const request = new Request("http://localhost/media", {
    method: "POST",
    body,
  });
  return run(() => read(uploadOwnerMediaResponse(request, propertyId)));
}

export async function updateOwnerGallery(
  propertyId: string,
  input: {
    expected_content_revision: number;
    items: Array<{
      media_id: string;
      revision: number;
      sort_order: number;
      is_selected_for_listing: boolean;
    }>;
  },
): Promise<OwnerPropertyMedia[]> {
  return run(() =>
    read(
      updateOwnerGalleryResponse(
        jsonRequest("/gallery", input),
        propertyId,
      ),
    ),
  );
}

export async function saveOwnerUnitSharedMedia(
  propertyId: string,
  unitId: string,
  input: {
    expected_content_revision: number;
    media_ids: string[];
  },
): Promise<{ content_revision: number }> {
  return run(() =>
    read(
      updateOwnerSharedMediaResponse(
        jsonRequest("/shared-media", input),
        propertyId,
        unitId,
      ),
    ),
  );
}

export async function updateOwnerUnitGallery(
  propertyId: string,
  unitId: string,
  input: {
    expected_content_revision: number;
    items: Array<{
      media_id: string;
      revision: number;
      sort_order: number;
      is_selected_for_listing: boolean;
    }>;
  },
): Promise<OwnerPropertyMedia[]> {
  return run(() =>
    read(
      updateOwnerGalleryResponse(
        jsonRequest("/gallery", input),
        propertyId,
        unitId,
      ),
    ),
  );
}

export async function removeOwnerMedia(
  propertyId: string,
  mediaId: string,
): Promise<{ id: string }> {
  return run(() => read(removeOwnerMediaResponse(propertyId, mediaId)));
}
