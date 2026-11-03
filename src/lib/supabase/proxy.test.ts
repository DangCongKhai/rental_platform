import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getClaims } = vi.hoisted(() => ({
  getClaims: vi.fn(async () => ({ data: { claims: null } })),
}));
vi.mock("../utils", () => ({ hasEnvVars: true }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims },
  }),
}));
import { updateSession } from "./proxy";
it("lets only the exact protected cron route reach its secret check without a browser session", async () => {
  const cron = await updateSession(
    new NextRequest("http://localhost/api/cron/expire-holds"),
  );
  expect(cron.status).toBe(200);
  expect(cron.headers.get("location")).toBeNull();
  for (const path of [
    "/api/cron/expire-holds/other",
    "/api/cron/other",
    "/owner/tenancies/foreign",
    "/tenant/tenancies/foreign",
  ]) {
    const response = await updateSession(
      new NextRequest(`http://localhost${path}`),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/login",
    );
  }
});

it("does not load a session on the email confirm callback", async () => {
  getClaims.mockClear();
  const response = await updateSession(
    new NextRequest(
      "http://localhost:3001/auth/confirm?code=auth-code&next=%2F",
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(getClaims).not.toHaveBeenCalled();
});
