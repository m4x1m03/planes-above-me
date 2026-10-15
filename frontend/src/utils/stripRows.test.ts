import { describe, it, expect } from "vitest";
import type { Plane } from "../types/planes";
import type { GeoPoint } from "./lookAngles";
import { buildStripRows } from "./stripRows";

// Observer in central Paris, on the ground
const PARIS: GeoPoint = { lat: 48.85, lon: 2.35, height: 0 };

// At this latitude: 0.1° of latitude ≈ 11.12 km, 0.1° of longitude ≈ 7.32 km
const plane = (over: Partial<Plane> = {}): Plane =>
  ({
    icao24: "abc123",
    lat: PARIS.lat,
    lon: PARIS.lon,
    geo_altitude: 10_000,
    baro_altitude: 9_800,
    ...over,
  }) as Plane;

// Planes north of Paris by a given number of degrees of latitude
const north = (icao24: string, dLat: number, over: Partial<Plane> = {}) =>
  plane({ icao24, lat: PARIS.lat + dLat, ...over });

// Smallest difference between two angles, so 359.99° and 0.01° count as close
const angleDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

const icaos = (rows: { plane: Plane }[]) => rows.map((r) => r.plane.icao24);

describe("buildStripRows", () => {
  describe("empty cases", () => {
    it("returns no rows without an observer", () => {
      expect(buildStripRows([north("a", 0.1)], null, 50, "distance")).toEqual([]);
    });

    it("returns no rows for an empty snapshot", () => {
      expect(buildStripRows([], PARIS, 50, "distance")).toEqual([]);
    });
  });

  describe("range filter", () => {
    it("includes a plane inside the range", () => {
      // 0.4° ≈ 44.5 km
      expect(buildStripRows([north("in", 0.4)], PARIS, 50, "distance")).toHaveLength(1);
    });

    it("excludes a plane outside the range", () => {
      // 0.5° ≈ 55.6 km
      expect(buildStripRows([north("out", 0.5)], PARIS, 50, "distance")).toHaveLength(0);
    });

    it("keeps only the in-range planes from a mixed snapshot", () => {
      const rows = buildStripRows(
        [north("near", 0.1), north("far", 0.5), north("mid", 0.3)],
        PARIS,
        50,
        "distance",
      );
      expect(icaos(rows)).toEqual(["near", "mid"]);
    });

    it("follows the selected range step", () => {
      const planes = [north("a", 0.05), north("b", 0.2), north("c", 0.4), north("d", 0.8)];
      // ≈ 5.6, 22.2, 44.5, 89 km
      expect(buildStripRows(planes, PARIS, 10, "distance")).toHaveLength(1);
      expect(buildStripRows(planes, PARIS, 25, "distance")).toHaveLength(2);
      expect(buildStripRows(planes, PARIS, 50, "distance")).toHaveLength(3);
      expect(buildStripRows(planes, PARIS, 100, "distance")).toHaveLength(4);
    });

    it("includes a plane directly overhead", () => {
      const rows = buildStripRows([plane({ icao24: "overhead" })], PARIS, 10, "distance");
      expect(rows).toHaveLength(1);
      expect(rows[0].distanceKm).toBeCloseTo(0, 1);
    });
  });

  describe("row contents", () => {
    it("returns the original plane object, not a copy", () => {
      const p = north("a", 0.1);
      const [row] = buildStripRows([p], PARIS, 50, "distance");
      expect(row.plane).toBe(p);
    });

    it("computes the horizontal distance in km", () => {
      const [row] = buildStripRows([north("a", 0.1)], PARIS, 50, "distance");
      expect(row.distanceKm).toBeCloseTo(11.12, 1);
    });

    it("ignores altitude in the distance", () => {
      const [low] = buildStripRows([north("low", 0.1, { geo_altitude: 0 })], PARIS, 50, "distance");
      const [high] = buildStripRows([north("high", 0.1, { geo_altitude: 11_000 })], PARIS, 50, "distance");
      expect(high.distanceKm).toBeCloseTo(low.distanceKm, 1);
    });

    it("gives azimuth ≈ 0° for a plane due north", () => {
      const [row] = buildStripRows([north("n", 0.1)], PARIS, 50, "distance");
      expect(angleDiff(row.azimuthDeg, 0)).toBeLessThan(0.01);
    });

    it("gives azimuth ≈ 90° for a plane due east", () => {
      const [row] = buildStripRows([plane({ icao24: "e", lon: PARIS.lon + 0.1 })], PARIS, 50, "distance");
      expect(angleDiff(row.azimuthDeg, 90)).toBeLessThan(0.5);
    });

    it("gives azimuth ≈ 180° for a plane due south", () => {
      const [row] = buildStripRows([north("s", -0.1)], PARIS, 50, "distance");
      expect(angleDiff(row.azimuthDeg, 180)).toBeLessThan(0.01);
    });

    it("gives azimuth ≈ 270° for a plane due west", () => {
      const [row] = buildStripRows([plane({ icao24: "w", lon: PARIS.lon - 0.1 })], PARIS, 50, "distance");
      expect(angleDiff(row.azimuthDeg, 270)).toBeLessThan(0.5);
    });

    it("gives a positive elevation for a plane in the air", () => {
      // 10 km up, ~11.12 km away → atan(10 / 11.12) ≈ 42°
      const [row] = buildStripRows([north("a", 0.1, { geo_altitude: 10_000 })], PARIS, 50, "distance");
      expect(row.elevationDeg).toBeGreaterThan(0);
      expect(row.elevationDeg).toBeCloseTo(42, 0);
    });

    it("gives elevation ≈ 90° for a plane straight overhead", () => {
      const [row] = buildStripRows([plane({ icao24: "up", geo_altitude: 10_000 })], PARIS, 50, "distance");
      expect(row.elevationDeg).toBeCloseTo(90, 0);
    });
  });

  describe("sorting", () => {
    // Deliberately shuffled: not in distance order, not in ICAO order
    const shuffled = () => [
      north("bbb", 0.3), // ≈ 33 km
      north("ccc", 0.1), // ≈ 11 km
      north("aaa", 0.2), // ≈ 22 km
    ];

    it("sorts nearest first by distance", () => {
      expect(icaos(buildStripRows(shuffled(), PARIS, 50, "distance"))).toEqual(["ccc", "aaa", "bbb"]);
    });

    it("sorts alphabetically by ICAO", () => {
      expect(icaos(buildStripRows(shuffled(), PARIS, 50, "icao"))).toEqual(["aaa", "bbb", "ccc"]);
    });

    it("breaks distance ties by ICAO, whatever the input order", () => {
      // Same position → exactly the same distance
      const a = plane({ icao24: "aaa", lat: PARIS.lat + 0.1 });
      const z = plane({ icao24: "zzz", lat: PARIS.lat + 0.1 });
      expect(icaos(buildStripRows([z, a], PARIS, 50, "distance"))).toEqual(["aaa", "zzz"]);
      expect(icaos(buildStripRows([a, z], PARIS, 50, "distance"))).toEqual(["aaa", "zzz"]);
    });

    it("does not reorder or change the input array", () => {
      const input = shuffled();
      const before = input.map((p) => p.icao24);
      buildStripRows(input, PARIS, 50, "distance");
      buildStripRows(input, PARIS, 50, "icao");
      expect(input.map((p) => p.icao24)).toEqual(before);
    });

    it("returns a new array each time", () => {
      const input = shuffled();
      expect(buildStripRows(input, PARIS, 50, "distance")).not.toBe(input);
    });
  });
});