export type GeoPoint = {
  latitude: number;
  longitude: number;
};

type AddressParts = {
  addressLine: string | null;
  ward: string | null;
  city: string | null;
};

function round6(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function parseGeocodePoint(body: unknown): GeoPoint | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const row = body[0];
  if (!row || typeof row !== "object") return null;
  const record = row as { lat?: unknown; lon?: unknown };
  const latitude = Number(record.lat);
  const longitude = Number(record.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return {
    latitude: round6(latitude),
    longitude: round6(longitude),
  };
}

function queryFor(address: AddressParts) {
  return [address.addressLine, address.ward, address.city, "Việt Nam"]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}

async function requestPoint(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "rentOS/1.0 (educational rental platform)",
    },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) return null;
  return parseGeocodePoint(await response.json());
}

export async function geocodeVietnamAddress(
  address: AddressParts,
): Promise<GeoPoint | null> {
  const query = queryFor(address);
  if (!query || query === "Việt Nam") return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const point = await requestPoint(query);
      if (point) return point;
    } catch (error) {
      console.error("Geocoding failed", error);
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return null;
}
