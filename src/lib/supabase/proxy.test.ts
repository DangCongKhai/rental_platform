import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../utils", () => ({ hasEnvVars: true }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: { claims: null } }) },
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
