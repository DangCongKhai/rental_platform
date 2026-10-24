import { describe, expect, it, vi } from "vitest";
import { ActionError, runAction } from "./action";

vi.mock("next/navigation", () => ({
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

describe("runAction", () => {
  it("returns ok with the callback data", async () => {
    await expect(runAction(async () => ({ id: "1" }))).resolves.toEqual({
      ok: true,
      data: { id: "1" },
    });
  });

  it("maps a suspended account to a failed result", async () => {
    await expect(
      runAction(async () => {
        throw new ActionError("SUSPENDED", "Tài khoản đã bị khoá.");
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Tài khoản đã bị khoá.",
    });
  });

  it("maps not found and forbidden errors to failed results", async () => {
    await expect(
      runAction(async () => {
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Không tìm thấy dữ liệu.",
    });

    await expect(
      runAction(async () => {
        throw new ActionError(
          "FORBIDDEN",
          "Bạn không có quyền thực hiện thao tác này.",
        );
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Bạn không có quyền thực hiện thao tác này.",
    });
  });

  it("rethrows a redirect so the signed-out user leaves the action", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    Object.assign(redirectError, {
      digest: "NEXT_REDIRECT;replace;/auth/login;307;",
    });

    await expect(
      runAction(async () => {
        throw redirectError;
      }),
    ).rejects.toBe(redirectError);
  });

  it("rethrows unexpected failures", async () => {
    await expect(
      runAction(async () => {
        throw new Error("db down");
      }),
    ).rejects.toThrow("db down");
  });
});
