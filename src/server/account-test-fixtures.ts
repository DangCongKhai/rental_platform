import { prisma } from "./db";

export async function insertAccountProfile() {
  const userId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (${userId}::uuid, ${`account-${userId}@rentos.test`}, '{"full_name":"Account Test"}'::jsonb, now(), now())
  `;
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { userId },
  });
  return profile;
}
export async function deleteAccountProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (profile)
    await prisma.notification.deleteMany({
      where: { recipientId: profile.id },
    });
  await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
}
