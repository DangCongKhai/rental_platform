import { Prisma } from "../../generated/prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createNotification } from "./notifications";
import { withRolledBackTransaction, withTransaction } from "./transaction";

const databaseUrl = process.env.DATABASE_URL;

async function insertProfile(
  tx: Prisma.TransactionClient,
): Promise<{ profileId: string; userId: string }> {
  const userId = crypto.randomUUID();
  await tx.$executeRawUnsafe(
    `INSERT INTO auth.users (
       id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token,
       reauthentication_token, is_sso_user, is_anonymous
     ) VALUES (
       $1::uuid, 'authenticated', 'authenticated', $2, '', now(),
       '{"provider":"email","providers":["email"]}',
       jsonb_build_object('full_name', 'Notify', 'avatar_url', 'https://example.com/seed/test.png'),
       now(), now(), $1::text, $1::text || '-r', $1::text || '-n', '', $1::text || '-c',
       '', $1::text || '-p', $1::text || '-a', false, false
     )`,
    userId,
    `notify-${userId}@rentos.test`,
  );
  const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id::text FROM user_profiles WHERE user_id = $1::uuid`,
    userId,
  );
  return { profileId: rows[0].id, userId };
}

describe.skipIf(!databaseUrl)("createNotification", () => {
  it("disappears when the caller rolls back", async () => {
    const eventKey = `rollback:${crypto.randomUUID()}`;
    await withRolledBackTransaction(async (tx) => {
      const { profileId } = await insertProfile(tx);
      await createNotification(tx, {
        recipientId: profileId,
        audience: "TENANT" as const,
        eventKey,
        title: "Rolled back",
        body: "This row should not remain.",
        link: { resourceType: "tenancy", resourceId: profileId },
      });
    });
    expect(await prisma.notification.count({ where: { eventKey } })).toBe(0);
  });

  it("stays visible after commit, then the test deletes it", async () => {
    const eventKey = `commit:${crypto.randomUUID()}`;
    const created = await withTransaction(async (tx) => {
      const profile = await insertProfile(tx);
      const notification = await createNotification(tx, {
        recipientId: profile.profileId,
        audience: "TENANT" as const,
        eventKey,
        title: "Committed",
        body: "This row should be visible.",
        link: { resourceType: "tenancy", resourceId: profile.profileId },
      });
      return { ...profile, notificationId: notification.id };
    });
    const row = await prisma.notification.findUnique({
      where: { id: created.notificationId },
    });
    expect(row?.eventKey).toBe(eventKey);
    await prisma.notification.delete({ where: { id: created.notificationId } });
    await prisma.$executeRawUnsafe(
      `DELETE FROM auth.users WHERE id = $1::uuid`,
      created.userId,
    );
    expect(await prisma.notification.count({ where: { eventKey } })).toBe(0);
  });

  it("rejects a repeated event key in the same transaction", async () => {
    const eventKey = `duplicate:${crypto.randomUUID()}`;
    await expect(
      withTransaction(async (tx) => {
        const { profileId } = await insertProfile(tx);
        const input = {
          recipientId: profileId,
          audience: "TENANT" as const,
          eventKey,
          title: "Once",
          body: "The second insert must fail.",
          link: { resourceType: "tenancy" as const, resourceId: profileId },
        };
        await createNotification(tx, input);
        await createNotification(tx, input);
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.notification.count({ where: { eventKey } })).toBe(0);
  });
});
