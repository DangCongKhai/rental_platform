import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const { verifyOtp } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp } }),
}));

import { GET } from "./route";

beforeEach(() => {
  verifyOtp.mockReset();
});

it("verifies the email token hash on the server and redirects home", async () => {
  verifyOtp.mockResolvedValue({ error: null });

  const response = await GET(
    new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=hashed-token&type=email",
    ),
  );

  expect(verifyOtp).toHaveBeenCalledWith({
    type: "email",
    token_hash: "hashed-token",
  });
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost:3000/");
});

it("keeps a safe next path and drops the token from the redirect", async () => {
  verifyOtp.mockResolvedValue({ error: null });

  const response = await GET(
    new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=hashed-token&type=email&next=%2Faccount",
    ),
  );

  expect(response.headers.get("location")).toBe(
    "http://localhost:3000/account",
  );
});

it("sends a link with no token to the error page", async () => {
  const response = await GET(
    new NextRequest("http://localhost:3000/auth/confirm"),
  );

  expect(verifyOtp).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe(
    "http://localhost:3000/auth/error?error=Li%C3%AAn+k%E1%BA%BFt+x%C3%A1c+nh%E1%BA%ADn+kh%C3%B4ng+h%E1%BB%A3p+l%E1%BB%87.",
  );
});

it("sends a rejected token to the error page", async () => {
  verifyOtp.mockResolvedValue({
    error: { code: "otp_expired", message: "Token has expired or is invalid" },
  });

  const response = await GET(
    new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=hashed-token&type=email",
    ),
  );

  const location = new URL(response.headers.get("location")!);
  expect(location.pathname).toBe("/auth/error");
  expect(location.searchParams.get("error")).toContain("Liên kết đã hết hạn");
});
