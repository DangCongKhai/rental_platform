import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireOwner, requireParty, requireUser } from "./auth";

const { getClaims, findUnique, queryRaw, redirect } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: `NEXT_REDIRECT;replace;${url};307;` });
    throw error;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
  }),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    userProfile: { findUnique },
    $queryRaw: queryRaw,
  },
}));

vi.mock("next/navigation", () => ({
  redirect,
  unstable_rethrow: (error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
  },
}));

const activeProfile = {
  id: "profile-1",
  userId: "user-1",
  email: "mai@example.com",
  fullName: "Mai Nguyen",
  isAdmin: false,
  accountStatus: "ACTIVE",
};

function signInAs(profile = activeProfile) {
  getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: profile.userId,
        email: profile.email,
        user_metadata: { is_admin: true },
      },
    },
  });
  findUnique.mockResolvedValue(profile);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUser", () => {
  it("redirects a signed-out caller to login", async () => {
    getClaims.mockResolvedValue({ data: { claims: null } });

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/login");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("redirects a session with no sub and does not query a profile", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { email: "mai@example.com" } },
    });

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/login");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("redirects when the verified sub has no profile", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "mai@example.com" } },
    });
    findUnique.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("loads the profile for the verified sub and ignores a user_id in form data", async () => {
    const formData = new FormData();
    formData.set("user_id", "00000000-0000-0000-0000-000000000099");
    signInAs();

    const user = await requireUser();

    expect(findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(user).toEqual({
      profileId: "profile-1",
      userId: "user-1",
      email: "mai@example.com",
      fullName: "Mai Nguyen",
      isAdmin: false,
    });
    expect(formData.get("user_id")).not.toBe(user.userId);
  });

  it("refuses a suspended account without redirecting", async () => {
    signInAs({ ...activeProfile, accountStatus: "SUSPENDED" });

    await expect(requireUser()).rejects.toThrow("Tài khoản đã bị khoá.");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("returns an admin profile from the database, not from claims", async () => {
    signInAs({ ...activeProfile, isAdmin: true });

    await expect(requireAdmin()).resolves.toMatchObject({
      profileId: "profile-1",
      isAdmin: true,
    });
  });

  it("refuses a normal user even when claims say they are an admin", async () => {
    signInAs({ ...activeProfile, isAdmin: false });

    await expect(requireAdmin()).rejects.toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });
});

describe("requireOwner", () => {
  it("returns the user when the property owner matches the profile", async () => {
    signInAs();
    queryRaw.mockResolvedValue([{ owner_id: "profile-1" }]);

    await expect(requireOwner("property-1")).resolves.toMatchObject({
      profileId: "profile-1",
    });
  });

  it("does not run a write when another owner calls the action", async () => {
    signInAs();
    queryRaw.mockResolvedValue([{ owner_id: "profile-2" }]);
    const write = vi.fn();

    await expect(async () => {
      await requireOwner("property-1");
      write();
    }).rejects.toThrow("Không tìm thấy dữ liệu.");

    expect(write).not.toHaveBeenCalled();
  });

  it("returns the same not-found error when the property is missing", async () => {
    signInAs();
    queryRaw.mockResolvedValue([]);
    const write = vi.fn();

    await expect(async () => {
      await requireOwner("missing-property");
      write();
    }).rejects.toThrow("Không tìm thấy dữ liệu.");

    expect(write).not.toHaveBeenCalled();
  });
});

describe("requireParty", () => {
  it("allows the tenant", async () => {
    signInAs();
    queryRaw.mockResolvedValue([
      { owner_id: "profile-2", tenant_id: "profile-1" },
    ]);

    await expect(requireParty("tenancy-1")).resolves.toMatchObject({
      profileId: "profile-1",
    });
  });

  it("allows the owner", async () => {
    signInAs();
    queryRaw.mockResolvedValue([
      { owner_id: "profile-1", tenant_id: "profile-2" },
    ]);

    await expect(requireParty("tenancy-1")).resolves.toMatchObject({
      profileId: "profile-1",
    });
  });

  it("returns not found for an outsider and does not run a write", async () => {
    signInAs();
    queryRaw.mockResolvedValue([
      { owner_id: "profile-2", tenant_id: "profile-3" },
    ]);
    const write = vi.fn();

    await expect(async () => {
      await requireParty("tenancy-1");
      write();
    }).rejects.toThrow("Không tìm thấy dữ liệu.");

    expect(write).not.toHaveBeenCalled();
  });
});
