export const MIN_WORD_SIMILARITY = 0.4;

export type LocationQuery = {
  value: string;
};

export function locationQueryFromInput(raw: string | null | undefined): LocationQuery | null {
  if (raw == null) return null;
  const value = raw.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!value) return null;
  return { value };
}
