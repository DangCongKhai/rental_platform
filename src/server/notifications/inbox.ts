"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { prisma } from "../db";

/** Session chrome for the navbar. Returns an empty result when signed out
 * instead of redirecting, so the header never suspends into the guest links. */
export async function previewNavbarAccount() {
  const user = await getCurrentUser();
  if (!user) return { user: null, notifications: [] };

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return { user, notifications: [] };

  const rows = await prisma.notification.findMany({
    where: { recipientId: profile.id },
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
  return {
    user,
    notifications: rows.map((row) => ({
      ...row,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markNotificationRead(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(id).success)
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    await prisma.notification.updateMany({
      where: { id, recipientId: user.profileId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  });
}

export async function markAllNotificationsRead() {
  return runAction(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { recipientId: user.profileId, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  });
}
