import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({
    profileId: "admin-profile",
    userId: "admin-user",
    email: "admin@example.test",
    fullName: "Admin",
    isAdmin: true,
  })),
  changeListingSuspension: vi.fn(
    async (_adminId: string, listingId: string) => ({
      listingId,
      propertyId: "property-id",
    }),
  ),
}));

vi.mock("@/server/auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/server/admin/listings", () => ({
  changeListingSuspension: mocks.changeListingSuspension,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { restoreListing, suspendListing } from "@/app/admin/listings/actions";

const validIds = [
  "01900000-0000-7000-0006-000000000001",
  "550e8400-e29b-41d4-a716-446655440000",
] as const;

describe("admin listing action ID validation", () => {
  afterEach(() => vi.clearAllMocks());

  it.each(validIds)(
    "accepts valid database UUID %s for suspend and restore",
    async (id) => {
      expect(await suspendListing(id, "Lý do đình chỉ")).toMatchObject({
        ok: true,
      });
      expect(await restoreListing(id, "Đã kiểm tra lại")).toMatchObject({
        ok: true,
      });

      expect(mocks.changeListingSuspension).toHaveBeenNthCalledWith(
        1,
        "admin-profile",
        id,
        "suspend",
        "Lý do đình chỉ",
      );
      expect(mocks.changeListingSuspension).toHaveBeenNthCalledWith(
        2,
        "admin-profile",
        id,
        "restore",
        "Đã kiểm tra lại",
      );
    },
  );

  it("rejects malformed IDs before calling the database action", async () => {
    expect(await suspendListing("not-a-uuid", "Lý do")).toMatchObject({
      ok: false,
    });
    expect(await restoreListing("not-a-uuid", "Ghi chú")).toMatchObject({
      ok: false,
    });
    expect(mocks.changeListingSuspension).not.toHaveBeenCalled();
  });
});
