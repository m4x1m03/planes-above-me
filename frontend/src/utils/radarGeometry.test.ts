import { describe, it, expect } from "vitest";
import type { ENU } from "./lookAngles";
import { toRadarXY, horizontalDistanceM, isInRange } from "./radarGeometry";

const R = 200; // radiusPx
const RANGE = 50; // km
const RANGE_M = RANGE * 1000;

const enu = (e: number, n: number, u = 0): ENU => ({ e, n, u });

function expectXY(actual: { x: number; y: number }, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

describe("toRadarXY", () => {
  describe("cardinal directions at full range land on the edge", () => {
    it("north → top", () => expectXY(toRadarXY(enu(0, RANGE_M), RANGE, R), 0, -R));
    it("east → right", () => expectXY(toRadarXY(enu(RANGE_M, 0), RANGE, R), R, 0));
    it("south → bottom", () => expectXY(toRadarXY(enu(0, -RANGE_M), RANGE, R), 0, R));
    it("west → left", () => expectXY(toRadarXY(enu(-RANGE_M, 0), RANGE, R), -R, 0));
  });

  it("puts a plane directly overhead at the centre", () => {
    expectXY(toRadarXY(enu(0, 0, 10_000), RANGE, R), 0, 0);
  });

  it("scales linearly: half range → half radius", () => {
    expectXY(toRadarXY(enu(RANGE_M / 2, 0), RANGE, R), R / 2, 0);
  });

  it("places a north-east plane in the top-right quadrant", () => {
    const { x, y } = toRadarXY(enu(10_000, 10_000), RANGE, R);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
    expect(x).toBeCloseTo(-y);
  });

  it("ignores altitude", () => {
    const low = toRadarXY(enu(12_000, -7_000, 0), RANGE, R);
    const high = toRadarXY(enu(12_000, -7_000, 11_000), RANGE, R);
    expectXY(high, low.x, low.y);
  });

  it("keeps the diagonal distance from the centre proportional", () => {
    // 3-4-5 triangle: 30 km east, 40 km north → 50 km → full radius
    const { x, y } = toRadarXY(enu(30_000, 40_000), RANGE, R);
    expect(Math.hypot(x, y)).toBeCloseTo(R);
  });

  it("zooms in when the range shrinks", () => {
    const plane = enu(10_000, 0);
    expectXY(toRadarXY(plane, 50, R), 40, 0);
    expectXY(toRadarXY(plane, 25, R), 80, 0);
    expectXY(toRadarXY(plane, 10, R), 200, 0);
  });

  it("scales with the radius in pixels", () => {
    const plane = enu(0, RANGE_M);
    expectXY(toRadarXY(plane, RANGE, 100), 0, -100);
    expectXY(toRadarXY(plane, RANGE, 350), 0, -350);
  });

  it("still projects out-of-range planes (filtering is the caller's job)", () => {
    expectXY(toRadarXY(enu(2 * RANGE_M, 0), RANGE, R), 2 * R, 0);
  });

  it("propagates NaN from a missing altitude-derived coordinate", () => {
    // Guards the null-altitude bug: if ENU ever contains NaN, we want to see it, not a silent (0, 0)
    const { x } = toRadarXY(enu(NaN, 0), RANGE, R);
    expect(Number.isNaN(x)).toBe(true);
  });
});

describe("horizontalDistanceM", () => {
  it("is zero directly overhead", () => {
    expect(horizontalDistanceM(enu(0, 0, 10_000))).toBe(0);
  });

  it("handles a 3-4-5 triangle", () => {
    expect(horizontalDistanceM(enu(3000, 4000))).toBeCloseTo(5000);
  });

  it("ignores altitude", () => {
    expect(horizontalDistanceM(enu(3000, 4000, 10_000))).toBeCloseTo(5000);
  });

  it("is always positive regardless of direction", () => {
    expect(horizontalDistanceM(enu(-3000, -4000))).toBeCloseTo(5000);
    expect(horizontalDistanceM(enu(-3000, 4000))).toBeCloseTo(5000);
  });
});

describe("isInRange", () => {
  it("includes a plane directly overhead", () => {
    expect(isInRange(enu(0, 0, 10_000), RANGE)).toBe(true);
  });

  it("includes a plane exactly on the edge", () => {
    expect(isInRange(enu(0, RANGE_M), RANGE)).toBe(true);
  });

  it("excludes a plane just past the edge", () => {
    expect(isInRange(enu(0, RANGE_M + 1), RANGE)).toBe(false);
  });

  it("uses the circle, not the bounding square", () => {
    // Inside the square's corner but outside the circle
    expect(isInRange(enu(40_000, 40_000), RANGE)).toBe(false);
  });

  it("ignores altitude (a high plane overhead is still in range)", () => {
    expect(isInRange(enu(1000, 1000, 100_000), RANGE)).toBe(true);
  });

  it("changes with the selected range step", () => {
    const plane = enu(30_000, 0);
    expect(isInRange(plane, 10)).toBe(false);
    expect(isInRange(plane, 25)).toBe(false);
    expect(isInRange(plane, 50)).toBe(true);
    expect(isInRange(plane, 100)).toBe(true);
  });

  it("treats NaN distance as out of range", () => {
    expect(isInRange(enu(NaN, 0), RANGE)).toBe(false);
  });

  it("agrees with toRadarXY: in-range planes land inside the circle", () => {
    const planes = [enu(30_000, 40_000), enu(-49_000, 5_000), enu(0, -1), enu(35_000, -35_000)];
    for (const p of planes) {
      const { x, y } = toRadarXY(p, RANGE, R);
      expect(isInRange(p, RANGE)).toBe(Math.hypot(x, y) <= R + 1e-9);
    }
  });
});