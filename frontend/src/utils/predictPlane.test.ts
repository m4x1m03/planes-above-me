import { describe, it, expect } from "vitest";
import { predictPlane } from "./predictPlane";
import type { Plane } from "../types/planes";

// 250 m/s for 10 s = 2500 m. 2500 / 6371000 rad in degrees ≈ 0.022483°
const DEG_PER_2500M = 0.022483;
const PRECISION = 5; // toBeCloseTo digits

const makePlane = (overrides: Partial<Plane> = {}): Plane =>
  ({
    icao24: "abc123",
    callsign: "TEST123",
    lat: 0,
    lon: 0,
    heading: 90,
    velocity: 250,
    time_position: 1000,
    on_ground: false,
    baro_altitude: 10000,
    vertical_rate: 0,
    ...overrides,
  }) as Plane;

const T0 = 1000;

describe("predictPlane", () => {
  describe("horizontal movement", () => {
    it("moves due east at the equator", () => {
      const result = predictPlane(makePlane({ heading: 90 }), T0 + 10);
      expect(result.lon).toBeCloseTo(DEG_PER_2500M, PRECISION);
      expect(result.lat).toBeCloseTo(0, PRECISION);
    });

    it("moves due north when heading is 0 (zero is a valid heading)", () => {
      const result = predictPlane(makePlane({ heading: 0 }), T0 + 10);
      expect(result.lat).toBeCloseTo(DEG_PER_2500M, PRECISION);
      expect(result.lon).toBeCloseTo(0, PRECISION);
    });

    it("moves due south", () => {
      const result = predictPlane(makePlane({ heading: 180 }), T0 + 10);
      expect(result.lat).toBeCloseTo(-DEG_PER_2500M, PRECISION);
      expect(result.lon).toBeCloseTo(0, PRECISION);
    });

    it("moves due west", () => {
      const result = predictPlane(makePlane({ heading: 270 }), T0 + 10);
      expect(result.lon).toBeCloseTo(-DEG_PER_2500M, PRECISION);
      expect(result.lat).toBeCloseTo(0, PRECISION);
    });

    it("splits movement evenly on a 45° heading", () => {
      const result = predictPlane(makePlane({ heading: 45 }), T0 + 10);
      const component = DEG_PER_2500M * Math.cos(Math.PI / 4);
      expect(result.lat).toBeCloseTo(component, PRECISION);
      expect(result.lon).toBeCloseTo(component, PRECISION);
    });

    it("treats headings as degrees, not radians", () => {
      // If heading were used as radians, 90 rad points roughly south-west-ish, not east
      const result = predictPlane(makePlane({ heading: 90 }), T0 + 10);
      expect(result.lon).toBeGreaterThan(0);
      expect(Math.abs(result.lat)).toBeLessThan(1e-9);
    });

    it("scales displacement linearly with time", () => {
      const at10 = predictPlane(makePlane(), T0 + 10);
      const at20 = predictPlane(makePlane(), T0 + 20);
      expect(at20.lon).toBeCloseTo(at10.lon * 2, PRECISION);
    });

    it("scales displacement linearly with velocity", () => {
      const slow = predictPlane(makePlane({ velocity: 100 }), T0 + 10);
      const fast = predictPlane(makePlane({ velocity: 200 }), T0 + 10);
      expect(fast.lon).toBeCloseTo(slow.lon * 2, PRECISION);
    });

    it("does not move a plane with zero velocity", () => {
      const result = predictPlane(makePlane({ velocity: 0 }), T0 + 10);
      expect(result.lat).toBe(0);
      expect(result.lon).toBe(0);
    });
  });

  describe("longitude scaling by latitude", () => {
    it("doubles eastward longitude change at 60° latitude", () => {
      const equator = predictPlane(makePlane({ lat: 0 }), T0 + 10);
      const sixty = predictPlane(makePlane({ lat: 60 }), T0 + 10);
      expect(sixty.lon).toBeCloseTo(equator.lon * 2, PRECISION);
    });

    it("applies the cos(lat) correction around Paris", () => {
      const lat = 48.9;
      const result = predictPlane(makePlane({ lat, lon: 2.35 }), T0 + 10);
      const expected = 2.35 + DEG_PER_2500M / Math.cos((lat * Math.PI) / 180);
      expect(result.lon).toBeCloseTo(expected, PRECISION);
    });

    it("does not scale northward movement by latitude", () => {
      const equator = predictPlane(makePlane({ lat: 0, heading: 0 }), T0 + 10);
      const sixty = predictPlane(makePlane({ lat: 60, heading: 0 }), T0 + 10);
      expect(sixty.lat - 60).toBeCloseTo(equator.lat, PRECISION);
    });

    it("handles the southern hemisphere symmetrically", () => {
      const north = predictPlane(makePlane({ lat: 45 }), T0 + 10);
      const south = predictPlane(makePlane({ lat: -45 }), T0 + 10);
      expect(south.lon).toBeCloseTo(north.lon, PRECISION);
    });
  });

  describe("time handling", () => {
    it("does not move the plane when dt is 0", () => {
      const result = predictPlane(makePlane({ lat: 10, lon: 20 }), T0);
      expect(result.lat).toBeCloseTo(10, PRECISION);
      expect(result.lon).toBeCloseTo(20, PRECISION);
    });

    it("does not move the plane backwards when dt is negative (clock skew)", () => {
      const result = predictPlane(makePlane({ lat: 10, lon: 20 }), T0 - 30);
      expect(result.lat).toBeCloseTo(10, PRECISION);
      expect(result.lon).toBeCloseTo(20, PRECISION);
    });

    it("clamps dt to 60 seconds instead of snapping back", () => {
      const at60 = predictPlane(makePlane(), T0 + 60);
      const at120 = predictPlane(makePlane(), T0 + 120);
      expect(at120.lon).toBeCloseTo(at60.lon, PRECISION);
      expect(at120.lon).toBeGreaterThan(0);
    });

    it("still predicts right below the clamp", () => {
      const at59 = predictPlane(makePlane(), T0 + 59);
      const at60 = predictPlane(makePlane(), T0 + 60);
      expect(at59.lon).toBeLessThan(at60.lon);
    });

    it("works when time_position is 0", () => {
      const result = predictPlane(makePlane({ time_position: 0 }), 10);
      expect(result.lon).toBeCloseTo(DEG_PER_2500M, PRECISION);
    });
  });

  describe("altitude", () => {
    it("climbs with positive vertical rate", () => {
      const result = predictPlane(makePlane({ baro_altitude: 3000, vertical_rate: 5 }), T0 + 10);
      expect(result.baro_altitude).toBeCloseTo(3050, PRECISION);
    });

    it("descends with negative vertical rate", () => {
      const result = predictPlane(makePlane({ baro_altitude: 3000, vertical_rate: -5 }), T0 + 10);
      expect(result.baro_altitude).toBeCloseTo(2950, PRECISION);
    });

    it("does not double the altitude", () => {
      const result = predictPlane(makePlane({ baro_altitude: 10000, vertical_rate: 0 }), T0 + 10);
      expect(result.baro_altitude).toBe(10000);
    });

    it("predicts from an altitude of 0", () => {
      const result = predictPlane(makePlane({ baro_altitude: 0, vertical_rate: 10 }), T0 + 10);
      expect(result.baro_altitude).toBeCloseTo(100, PRECISION);
    });

    it("keeps altitude unchanged when vertical_rate is null", () => {
      const result = predictPlane(makePlane({ baro_altitude: 5000, vertical_rate: null }), T0 + 10);
      expect(result.baro_altitude).toBe(5000);
    });

    it("keeps altitude null when baro_altitude is null", () => {
      const result = predictPlane(makePlane({ baro_altitude: null, vertical_rate: 5 }), T0 + 10);
      expect(result.baro_altitude).toBeNull();
    });

    it("still moves horizontally when altitude data is missing", () => {
      const result = predictPlane(makePlane({ baro_altitude: null, vertical_rate: null }), T0 + 10);
      expect(result.lon).toBeCloseTo(DEG_PER_2500M, PRECISION);
    });

    it("clamps altitude change along with dt", () => {
      const result = predictPlane(makePlane({ baro_altitude: 3000, vertical_rate: 5 }), T0 + 120);
      expect(result.baro_altitude).toBeCloseTo(3300, PRECISION);
    });
  });

  describe("guards (returns the plane unchanged)", () => {
    it.each([
      ["velocity is null", { velocity: null }],
      ["heading is null", { heading: null }],
      ["time_position is null", { time_position: null }],
      ["plane is on the ground", { on_ground: true }],
    ])("when %s", (_label, overrides) => {
      const plane = makePlane({ lat: 10, lon: 20, ...(overrides as Partial<Plane>) });
      const result = predictPlane(plane, T0 + 10);
      expect(result).toBe(plane);
      expect(result.lat).toBe(10);
      expect(result.lon).toBe(20);
    });
  });

  describe("immutability", () => {
    it("does not mutate the input plane", () => {
      const plane = makePlane({ lat: 10, lon: 20, baro_altitude: 3000, vertical_rate: 5 });
      const snapshot = structuredClone(plane);
      predictPlane(plane, T0 + 10);
      expect(plane).toEqual(snapshot);
    });

    it("returns a new object when it predicts", () => {
      const plane = makePlane();
      const result = predictPlane(plane, T0 + 10);
      expect(result).not.toBe(plane);
    });

    it("gives the same result when called repeatedly on the same input", () => {
      // Guards against accumulation if the render loop calls this every frame
      const plane = makePlane();
      const first = predictPlane(plane, T0 + 10);
      predictPlane(plane, T0 + 10);
      predictPlane(plane, T0 + 10);
      const fourth = predictPlane(plane, T0 + 10);
      expect(fourth.lon).toBeCloseTo(first.lon, PRECISION);
    });

    it("preserves fields it does not predict", () => {
      const plane = makePlane({ icao24: "4ca7b3", callsign: "AFR123", heading: 90, velocity: 250 });
      const result = predictPlane(plane, T0 + 10);
      expect(result.icao24).toBe("4ca7b3");
      expect(result.callsign).toBe("AFR123");
      expect(result.heading).toBe(90);
      expect(result.velocity).toBe(250);
      expect(result.time_position).toBe(T0);
    });
  });
});