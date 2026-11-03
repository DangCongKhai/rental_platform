import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./db";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "./account-test-fixtures";
import {
  publishedListing,
  cleanupPublicListings,
} from "./listings/public-listing-fixture";
const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("./auth", () => ({ requireUser: vi.fn(async () => actor) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  getMyFavourites,
  getMyFavouriteIds,
  removeFavourite,
  saveFavourite,
} from "./favourites";
const users: string[] = [];
afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  await prisma.favouriteProperty.deleteMany({
    where: { user: { userId: { in: users } } },
  });
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
});
async function account() {
  const profile = await insertAccountProfile();
  users.push(profile.userId);
  actor.profileId = profile.id;
  return profile;
}
describe.skipIf(!process.env.DATABASE_URL)("private favourites", () => {
  it("saves and removes idempotently, scoped to the session", async () => {
    const first = await account();
    const listing = await publishedListing();
    const results = await Promise.all([
      saveFavourite(listing.propertyId),
      saveFavourite(listing.propertyId),
    ]);
    expect(results.every((row) => row.ok)).toBe(true);
    expect(
      await prisma.favouriteProperty.count({
        where: { userId: first.id, propertyId: listing.propertyId },
      }),
    ).toBe(1);
    expect(await getMyFavourites()).toMatchObject([
      {
        propertyId: listing.propertyId,
        available: true,
        card: { id: listing.listingId },
      },
    ]);
    await account();
    expect(await getMyFavourites()).toEqual([]);
    expect(await getMyFavouriteIds()).toEqual([]);
    await removeFavourite(listing.propertyId);
    expect(
      await prisma.favouriteProperty.count({ where: { userId: first.id } }),
    ).toBe(1);
    actor.profileId = first.id;
    await removeFavourite(listing.propertyId);
    await removeFavourite(listing.propertyId);
    expect(await getMyFavourites()).toEqual([]);
  });
  it("redacts hidden properties and allows removal", async () => {
    await account();
    const listing = await publishedListing();
    await saveFavourite(listing.propertyId);
    await prisma.listing.update({
      where: { id: listing.listingId },
      data: { publicationStatus: "HIDDEN" },
    });
    expect(await getMyFavourites()).toEqual([
      { propertyId: listing.propertyId, available: false },
    ]);
    expect((await saveFavourite(listing.propertyId)).ok).toBe(false);
    expect((await removeFavourite(listing.propertyId)).ok).toBe(true);
    expect(await getMyFavourites()).toEqual([]);
  });
});
