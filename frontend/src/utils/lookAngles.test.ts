import { describe, it, expect } from "vitest";
import { computeLookAngles, type GeoPoint } from "./lookAngles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Smallest difference between two compass angles, handling the 0/360 wrap. */
function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** Asserts two compass angles agree within `toleranceDeg`, across the 0/360 boundary. */
function expectAzimuthNear(actual: number, expected: number, toleranceDeg: number) {
  expect(angularDiff(actual, expected)).toBeLessThan(toleranceDeg);
}

const toRad = (deg: number) => deg * (Math.PI / 180);
const toDeg = (rad: number) => rad * (180 / Math.PI);

/** Rough meters per degree of latitude; good enough to place test planes. */
const METERS_PER_DEG_LAT = 111_320;

/**
 * Independent reference: elevation angle on a spherical Earth.
 * Uses different math (plane geometry on a circle) than the ECEF/ENU
 * implementation, so agreement is a meaningful cross-check.
 */
function sphericalElevationDeg(
  centralAngleRad: number,
  observerHeight: number,
  targetHeight: number,
  radius = 6_371_000,
): number {
  const ro = radius + observerHeight;
  const rt = radius + targetHeight;
  return toDeg(
    Math.atan2(rt * Math.cos(centralAngleRad) - ro, rt * Math.sin(centralAngleRad)),
  );
}

// Observer on the ground in Paris
const paris: GeoPoint = { lat: 48.85, lon: 2.35, height: 0 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeLookAngles", () => {
  describe("basic geometry", () => {
    it("puts a plane directly overhead at 90° elevation", () => {
      const plane: GeoPoint = { ...paris, height: 10_000 };
      const result = computeLookAngles(paris, plane);

      expect(result.elevationDeg).toBeCloseTo(90, 3);
      expect(result.slantRangeM).toBeCloseTo(10_000, 3);
      // Azimuth is deliberately not checked: straight up, it is undefined.
    });

    it("accounts for the observer's own height", () => {
      const observer: GeoPoint = { ...paris, height: 400 };
      const plane: GeoPoint = { ...paris, height: 10_000 };
      const result = computeLookAngles(observer, plane);

      expect(result.elevationDeg).toBeCloseTo(90, 3);
      expect(result.slantRangeM).toBeCloseTo(9_600, 3);
    });

    it("returns zero range when both points are identical", () => {
      const result = computeLookAngles(paris, { ...paris });
      expect(result.slantRangeM).toBeCloseTo(0, 6);
    });
  });

  describe("azimuth", () => {
    // Plane at cruise altitude, offset 0.1° from the observer.
    // East/west are not exactly 90/270: a line of latitude is not a straight
    // path on the globe, so the direct bearing bends slightly toward the pole.
    it.each([
      { direction: "north", dLat: 0.1, dLon: 0, expected: 0 },
      { direction: "east", dLat: 0, dLon: 0.1, expected: 90 },
      { direction: "south", dLat: -0.1, dLon: 0, expected: 180 },
      { direction: "west", dLat: 0, dLon: -0.1, expected: 270 },
    ])("points $direction ($expected°)", ({ dLat, dLon, expected }) => {
      const plane: GeoPoint = { lat: paris.lat + dLat, lon: paris.lon + dLon, height: 10_000 };
      const result = computeLookAngles(paris, plane);

      expectAzimuthNear(result.azimuthDeg, expected, 0.1);
    });

    it("points northeast for an equal north and east offset", () => {
      // Scale the longitude offset so it covers the same ground distance
      // as the latitude offset (meridians converge toward the poles).
      const dLat = 0.1;
      const dLon = dLat / Math.cos(toRad(paris.lat));
      const plane: GeoPoint = { lat: paris.lat + dLat, lon: paris.lon + dLon, height: 10_000 };

      expectAzimuthNear(computeLookAngles(paris, plane).azimuthDeg, 45, 0.2);
    });

    it("wraps just-west-of-north to ~360°, never negative", () => {
      const plane: GeoPoint = { lat: paris.lat + 0.1, lon: paris.lon - 0.0001, height: 10_000 };
      const { azimuthDeg } = computeLookAngles(paris, plane);

      expect(azimuthDeg).toBeGreaterThan(359);
      expect(azimuthDeg).toBeLessThan(360);
    });

    it("gives reciprocal bearings (~180° apart) over short distances", () => {
      const a: GeoPoint = { lat: 48.85, lon: 2.35, height: 0 };
      const b: GeoPoint = { lat: 48.9, lon: 2.45, height: 0 };

      const ab = computeLookAngles(a, b).azimuthDeg;
      const ba = computeLookAngles(b, a).azimuthDeg;

      expect(angularDiff(ab, ba)).toBeCloseTo(180, 0);
    });

    it("handles the antimeridian (179.95°E looking at 179.95°W is east)", () => {
      const observer: GeoPoint = { lat: 0, lon: 179.95, height: 0 };
      const plane: GeoPoint = { lat: 0, lon: -179.95, height: 10_000 };

      expectAzimuthNear(computeLookAngles(observer, plane).azimuthDeg, 90, 0.1);
    });

    it("handles paths over the pole (plane on the far side is due north)", () => {
      const observer: GeoPoint = { lat: 89.95, lon: 0, height: 0 };
      const plane: GeoPoint = { lat: 89.95, lon: 180, height: 10_000 };

      expectAzimuthNear(computeLookAngles(observer, plane).azimuthDeg, 0, 0.1);
    });

    it("works in the southern hemisphere", () => {
      const sydney: GeoPoint = { lat: -33.87, lon: 151.21, height: 0 };
      const north: GeoPoint = { lat: -33.77, lon: 151.21, height: 10_000 };
      const west: GeoPoint = { lat: -33.87, lon: 151.11, height: 10_000 };

      expectAzimuthNear(computeLookAngles(sydney, north).azimuthDeg, 0, 0.1);
      expectAzimuthNear(computeLookAngles(sydney, west).azimuthDeg, 270, 0.1);
    });
  });

  describe("elevation", () => {
    it("matches flat-earth trigonometry for a nearby plane", () => {
      // ~10 km north, 1 km up: curvature is negligible at this range.
      const groundDistance = 10_000;
      const plane: GeoPoint = {
        lat: paris.lat + groundDistance / METERS_PER_DEG_LAT,
        lon: paris.lon,
        height: 1_000,
      };
      const flatEstimate = toDeg(Math.atan(1_000 / groundDistance)); // ≈ 5.71°

      expect(computeLookAngles(paris, plane).elevationDeg).toBeCloseTo(flatEstimate, 1);
    });

    it("puts a same-height target below the horizon due to curvature", () => {
      // On a sphere, a target at the same height sits below the horizon by
      // half the central angle: 1° apart → about -0.5°.
      const plane: GeoPoint = { lat: paris.lat + 1, lon: paris.lon, height: 0 };
      const { elevationDeg } = computeLookAngles(paris, plane);

      expect(elevationDeg).toBeLessThan(0);
      expect(elevationDeg).toBeCloseTo(-0.5, 1);
    });

    it.each([50, 150, 300])(
      "agrees with a spherical-earth model for a cruising plane %i km away",
      (km) => {
        const centralAngleDeg = (km * 1_000) / METERS_PER_DEG_LAT;
        const plane: GeoPoint = { lat: paris.lat + centralAngleDeg, lon: paris.lon, height: 11_000 };

        const expected = sphericalElevationDeg(toRad(centralAngleDeg), 0, 11_000);
        const { elevationDeg } = computeLookAngles(paris, plane);

        // Sphere vs ellipsoid differ slightly; 0.05° is still far tighter
        // than the ~0.9° error a flat-earth formula would make at 300 km.
        expect(Math.abs(elevationDeg - expected)).toBeLessThan(0.05);
      },
    );

    it("hides a cruising plane beyond the horizon (negative elevation)", () => {
      // An 11 km high plane drops below a ground observer's horizon at
      // roughly 375 km.
      const plane: GeoPoint = {
        lat: paris.lat + 500_000 / METERS_PER_DEG_LAT,
        lon: paris.lon,
        height: 11_000,
      };

      expect(computeLookAngles(paris, plane).elevationDeg).toBeLessThan(0);
    });

    it("gives negative elevation when looking down at a lower plane", () => {
      // Observer on a 1000 m hill, plane at 500 m, 2 km away.
      const observer: GeoPoint = { ...paris, height: 1_000 };
      const plane: GeoPoint = {
        lat: paris.lat + 2_000 / METERS_PER_DEG_LAT,
        lon: paris.lon,
        height: 500,
      };
      const flatEstimate = toDeg(Math.atan(-500 / 2_000)); // ≈ -14.04°

      expect(computeLookAngles(observer, plane).elevationDeg).toBeCloseTo(flatEstimate, 1);
    });
  });

  describe("slant range", () => {
    it("matches Pythagoras for a nearby plane", () => {
      const groundDistance = 10_000;
      const plane: GeoPoint = {
        lat: paris.lat + groundDistance / METERS_PER_DEG_LAT,
        lon: paris.lon,
        height: 3_000,
      };
      const expected = Math.hypot(groundDistance, 3_000);
      const { slantRangeM } = computeLookAngles(paris, plane);

      // Within 0.5%: the degrees-to-meters conversion above is approximate.
      expect(Math.abs(slantRangeM - expected) / expected).toBeLessThan(0.005);
    });

    it("is the same in both directions", () => {
      const a: GeoPoint = { lat: 48.85, lon: 2.35, height: 50 };
      const b: GeoPoint = { lat: 49.2, lon: 1.9, height: 11_000 };

      expect(computeLookAngles(a, b).slantRangeM).toBeCloseTo(
        computeLookAngles(b, a).slantRangeM,
        6,
      );
    });
  });

  describe("output ranges", () => {
    it("always returns azimuth in [0, 360) and elevation in [-90, 90]", () => {
      // Deterministic grid of targets around the observer in every direction.
      for (let dLat = -2; dLat <= 2; dLat += 0.5) {
        for (let dLon = -2; dLon <= 2; dLon += 0.5) {
          for (const height of [0, 1_000, 11_000]) {
            const plane: GeoPoint = { lat: paris.lat + dLat, lon: paris.lon + dLon, height };
            const { azimuthDeg, elevationDeg, slantRangeM } = computeLookAngles(paris, plane);

            expect(azimuthDeg).toBeGreaterThanOrEqual(0);
            expect(azimuthDeg).toBeLessThan(360);
            expect(elevationDeg).toBeGreaterThanOrEqual(-90);
            expect(elevationDeg).toBeLessThanOrEqual(90);
            expect(slantRangeM).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });
  });
});