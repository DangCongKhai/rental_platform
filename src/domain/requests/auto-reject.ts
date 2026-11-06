export const REQUEST_AUTO_REJECT_AFTER_MS = 15 * 24 * 60 * 60 * 1000;

export function requestIsDue(createdAt: Date, now: Date) {
  return now.getTime() - createdAt.getTime() >= REQUEST_AUTO_REJECT_AFTER_MS;
}

/** Date-only tenancy ranges are inclusive, matching the stored DB date fields. */
export function requestDatesOverlap(
  request: { start: Date; end: Date },
  tenancy: { start: Date; end: Date },
) {
  return tenancy.start <= request.end && tenancy.end >= request.start;
}
