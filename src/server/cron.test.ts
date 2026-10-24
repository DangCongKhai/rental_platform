import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCronRequest } from "./cron";

afterEach(() => {
  vi.unstubAllEnvs();
});

function cronRequest(authorization?: string) {
  return new Request("http://localhost/api/cron/expire-holds", {
    headers: authorization ? { authorization } : {},
  });
}

describe("assertCronRequest", () => {
  it("accepts the configured bearer token", () => {
    vi.stubEnv("CRON_SECRET", "secret-value");

    expect(
      assertCronRequest(cronRequest("Bearer secret-value")),
    ).toBeNull();
  });

  it("returns 401 when the header is missing", () => {
    vi.stubEnv("CRON_SECRET", "secret-value");

    expect(assertCronRequest(cronRequest())?.status).toBe(401);
  });

  it("returns 401 when the token does not match", () => {
    vi.stubEnv("CRON_SECRET", "secret-value");

    expect(assertCronRequest(cronRequest("Bearer other"))?.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");

    expect(assertCronRequest(cronRequest("Bearer "))?.status).toBe(401);
  });
});
