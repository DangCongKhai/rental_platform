"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { ActionError, runAction } from "./action";
import { prisma } from "./db";

const profileInput = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(
        (value) => !value || /^(0\d{9}|\+84\d{9})$/.test(value),
        "Số điện thoại không hợp lệ.",
      ),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export async function getMyProfile() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: user.profileId },
    select: { fullName: true, phone: true, email: true, updatedAt: true },
  });
  return {
    ...profile,
    phone: profile.phone ?? "",
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function updateProfile(input: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = profileInput.safeParse(input);
    if (!parsed.success)
      throw new ActionError("CONFLICT", "Dữ liệu không hợp lệ.");
    const { fullName, phone, updatedAt } = parsed.data;
    // Compare and write in one statement. JS dates have millisecond precision; the
    // database's initial timestamp can have microseconds. Advance the token even
    // when two saves arrive during the same millisecond.
    const rows = await prisma.$queryRaw<Array<{ updatedAt: Date }>>`
      UPDATE user_profiles
      SET full_name = ${fullName}, phone = ${phone || null},
          updated_at = date_trunc('milliseconds', GREATEST(clock_timestamp(), updated_at + interval '1 millisecond'))
      WHERE id = ${user.profileId}::uuid
        AND date_trunc('milliseconds', updated_at) = ${new Date(updatedAt)}::timestamptz
      RETURNING updated_at AS "updatedAt"
    `;
    if (!rows.length)
      throw new ActionError("CONFLICT", "Trang đã cũ. Tải lại rồi thử lại.");
    revalidatePath("/", "layout");
    return { updatedAt: rows[0].updatedAt.toISOString() };
  });
}
