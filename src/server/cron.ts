import { timingSafeEqual } from "node:crypto";

function sameBearer(header: string, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Returns 401 unless the request presents the server cron secret. */
export function assertCronRequest(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header || !sameBearer(header, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
