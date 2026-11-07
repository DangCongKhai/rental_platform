/** About 550m. Snapping hides the door inside a neighbourhood cell. */
const SNAP_DEGREES = 0.005;
/** Covers the whole snapped cell, including its corners. */
const RADIUS_METERS = 500;

export type ApproximateArea = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

function snap(value: number) {
  return Math.round(value / SNAP_DEGREES) * SNAP_DEGREES;
}

/**
 * Public map position. The stored coordinates are not returned: the centre is
 * the nearest 0.005° cell, and the circle is wide enough to contain the door.
 */
export function approximateArea(
  latitude: number,
  longitude: number,
): ApproximateArea | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return {
    latitude: Number(snap(latitude).toFixed(6)),
    longitude: Number(snap(longitude).toFixed(6)),
    radiusMeters: RADIUS_METERS,
  };
}
