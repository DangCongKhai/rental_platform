/** Compare date-only terms in UTC, clamping month-end days. */
export function meetsMinimumTerm(start: Date, end: Date): boolean {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
    return false;
  const target = new Date(start);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + 3);
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(start.getUTCDate(), last));
  return end.getTime() >= target.getTime();
}
