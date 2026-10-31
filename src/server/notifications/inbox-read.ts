import { z } from "zod";
import { requireUser } from "../auth";
import { prisma } from "../db";

const optionsSchema = z
  .object({ audience: z.enum(["TENANT", "OWNER", "ADMIN"]).optional() })
  .strict();

export async function getMyNotifications(
  options: { audience?: "TENANT" | "OWNER" | "ADMIN" } = {},
) {
  const user = await requireUser();
  const { audience } = optionsSchema.parse(options);
  const rows = await prisma.notification.findMany({
    where: { recipientId: user.profileId, ...(audience ? { audience } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      audience: true,
      title: true,
      body: true,
      resourceType: true,
      resourceId: true,
      readAt: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getUnreadCount() {
  const user = await requireUser();
  return prisma.notification.count({
    where: { recipientId: user.profileId, readAt: null },
  });
}
