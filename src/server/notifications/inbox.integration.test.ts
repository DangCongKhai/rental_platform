import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "../account-test-fixtures";

const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("../auth", () => ({ requireUser: vi.fn(async () => actor) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { markAllNotificationsRead, markNotificationRead } from "./inbox";
import { getMyNotifications, getUnreadCount } from "./inbox-read";

const created: string[] = [];
afterEach(async () => {
  for (const id of created.splice(0)) await deleteAccountProfile(id);
});
async function profile() {
  const row = await insertAccountProfile();
  created.push(row.userId);
  return row;
}
async function notify(recipientId: string, audience: string) {
  return prisma.notification.create({
    data: {
      recipientId,
      audience,
      title: audience,
      body: "Message",
      eventKey: crypto.randomUUID(),
      resourceType: "tenancy",
      resourceId: crypto.randomUUID(),
    },
  });
}

describe.skipIf(!process.env.DATABASE_URL)("session notification inbox", () => {
  it("lists both audiences newest first, filters by audience, and excludes other users", async () => {
    const own = await profile(),
      other = await profile();
    actor.profileId = own.id;
    const tenant = await notify(own.id, "TENANT");
    const owner = await notify(own.id, "OWNER");
    const foreign = await notify(other.id, "TENANT");
    const rows = await getMyNotifications();
    expect(rows.map((row) => row.id)).toEqual([owner.id, tenant.id]);
    expect(rows.map((row) => row.audience)).toEqual(["OWNER", "TENANT"]);
    expect(
      (await getMyNotifications({ audience: "TENANT" })).map((row) => row.id),
    ).toEqual([tenant.id]);
    expect(await getUnreadCount()).toBe(2);
    await markNotificationRead(foreign.id);
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: foreign.id },
        })
      ).readAt,
    ).toBeNull();
    await markAllNotificationsRead();
    expect(await getUnreadCount()).toBe(0);
    actor.profileId = other.id;
    expect(await getUnreadCount()).toBe(1);
    expect((await getMyNotifications()).map((row) => row.id)).toEqual([
      foreign.id,
    ]);
  });
  it("preserves the first read timestamp on repeated read", async () => {
    const own = await profile();
    actor.profileId = own.id;
    const row = await notify(own.id, "TENANT");
    await markNotificationRead(row.id);
    const first = await prisma.notification.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(first.readAt).not.toBeNull();
    await markNotificationRead(row.id);
    await markAllNotificationsRead();
    const second = await prisma.notification.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(second.readAt?.getTime()).toBe(first.readAt?.getTime());
  });
  it("database rejects invalid audience values", async () => {
    const own = await profile();
    await expect(notify(own.id, "INVALID")).rejects.toThrow();
  });
});
