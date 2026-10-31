import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./db";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "./account-test-fixtures";

const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("./auth", () => ({ requireUser: vi.fn(async () => actor) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { getMyProfile, updateProfile } from "./profile";

const created: string[] = [];
afterEach(async () => {
  for (const id of created.splice(0)) await deleteAccountProfile(id);
});
async function setup() {
  const profile = await insertAccountProfile();
  created.push(profile.userId);
  actor.profileId = profile.id;
  return profile;
}

describe.skipIf(!process.env.DATABASE_URL)("profile actions", () => {
  it("rejects privileged fields and updates only the current profile", async () => {
    const profile = await setup();
    const input = {
      fullName: "Updated Name",
      phone: "0905123456",
      updatedAt: profile.updatedAt.toISOString(),
    };
    expect((await updateProfile({ ...input, isAdmin: true })).ok).toBe(false);
    expect(
      (
        await prisma.userProfile.findUniqueOrThrow({
          where: { id: profile.id },
        })
      ).isAdmin,
    ).toBe(false);
    expect(
      (await updateProfile({ ...input, userId: crypto.randomUUID() })).ok,
    ).toBe(false);
    expect((await updateProfile({ ...input, phone: "bad" })).ok).toBe(false);
    expect((await updateProfile(input)).ok).toBe(true);
    expect(await getMyProfile()).toMatchObject({
      fullName: "Updated Name",
      phone: "0905123456",
      email: profile.email,
    });
    const row = await prisma.userProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    expect(row.isAdmin).toBe(false);
    expect(row.email).toBe(profile.email);
  });

  it("atomically rejects a stale concurrent save", async () => {
    const profile = await setup();
    const input = {
      fullName: "First",
      phone: "",
      updatedAt: profile.updatedAt.toISOString(),
    };
    const results = await Promise.all([
      updateProfile(input),
      updateProfile({ ...input, fullName: "Second" }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toEqual({
      ok: false,
      error: "Trang đã cũ. Tải lại rồi thử lại.",
    });
  });
});
