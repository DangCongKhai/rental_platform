import { expect, it } from "vitest";
import { approximateArea } from "./approximate-area";

function metresBetween(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const lat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const lng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const mid = ((from.latitude + to.latitude) * Math.PI) / 360;
  const y = lat * 6_371_000;
  const x = lng * 6_371_000 * Math.cos(mid);
  return Math.hypot(x, y);
}

it("hides the door inside a neighbourhood circle", () => {
  const door = { latitude: 16.062588, longitude: 108.210201 };
  const area = approximateArea(door.latitude, door.longitude);
  expect(area).not.toBeNull();
  expect(area).not.toMatchObject(door);
  expect(
    metresBetween(door, {
      latitude: area!.latitude,
      longitude: area!.longitude,
    }),
  ).toBeLessThanOrEqual(area!.radiusMeters);
  expect(area!.radiusMeters).toBe(500);
});

it("rejects coordinates that cannot be a place", () => {
  expect(approximateArea(Number.NaN, 108)).toBeNull();
  expect(approximateArea(91, 108)).toBeNull();
  expect(approximateArea(16, 181)).toBeNull();
});
