import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActionError } from "./action";
import { prisma } from "./db";
import { findPropertyOwnerId, findTenancyParties } from "./records";

export type SessionUser = {
  profileId: string;
  userId: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
};

const NOT_FOUND = "Không tìm thấy dữ liệu.";

function toSessionUser(profile: {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
}): SessionUser {
  return {
    profileId: profile.id,
    userId: profile.userId,
    email: profile.email,
    fullName: profile.fullName,
    isAdmin: profile.isAdmin,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    redirect("/auth/login");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: sub },
  });
  if (!profile) redirect("/auth/login");

  if (profile.accountStatus !== "ACTIVE") {
    throw new ActionError("SUSPENDED", "Tài khoản đã bị khoá.");
  }

  return toSessionUser(profile);
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new ActionError(
      "FORBIDDEN",
      "Bạn không có quyền thực hiện thao tác này.",
    );
  }
  return user;
}

export async function requireOwner(propertyId: string): Promise<SessionUser> {
  const user = await requireUser();
  const ownerId = await findPropertyOwnerId(propertyId);
  if (!ownerId || ownerId !== user.profileId) {
    throw new ActionError("NOT_FOUND", NOT_FOUND);
  }
  return user;
}

export async function requireParty(tenancyId: string): Promise<SessionUser> {
  const user = await requireUser();
  const parties = await findTenancyParties(tenancyId);
  if (
    !parties ||
    (parties.ownerId !== user.profileId && parties.tenantId !== user.profileId)
  ) {
    throw new ActionError("NOT_FOUND", NOT_FOUND);
  }
  return user;
}
