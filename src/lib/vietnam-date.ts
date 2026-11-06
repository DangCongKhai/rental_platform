const vietnamDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Calendar day in Vietnam, always padded as dd/mm/yyyy. */
export function formatVietnamDate(
  value: Date | string | null | undefined,
) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return vietnamDay.format(date);
}

/** Format an ISO calendar date as the Vietnamese day/month/year input format. */
export function formatVietnamDateInput(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** Parse dd/mm/yyyy without relying on the browser's locale or date parsing. */
export function parseVietnamDateInput(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso
    ? null
    : iso;
}
