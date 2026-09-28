import type { GeoPoint } from "./lookAngles";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes.ts";

// Vertical accuracy (m) above which a GPS altitude is not trusted.
const MAX_ALTITUDE_ACCURACY_M = 50;

export type ObserverHeightSource = "gps" | "assumed";
export type PlaneAltitudeSource = "geo" | "baro";

/**
 * Picks the observer's height: the GPS altitude when the device reports one
 * with good vertical accuracy, otherwise sea level (0 m), flagged as assumed.
 */
export function resolveObserverHeight(coords: Coords): {
  height: number;
  source: ObserverHeightSource;
} {
  const { altitude, altitude_accuracy } = coords;

  if (
    altitude !== null &&
    altitude_accuracy !== null &&
    altitude_accuracy <= MAX_ALTITUDE_ACCURACY_M
  ) {
    return { height: altitude, source: "gps" };
  }

  return { height: 0, source: "assumed" };
}

/** Builds the observer's GeoPoint from the browser coords. */
export function coordsToGeoPoint(coords: Coords): {
  point: GeoPoint;
  heightSource: ObserverHeightSource;
} {
  const { height, source } = resolveObserverHeight(coords);
  return {
    point: { lat: coords.latitude, lon: coords.longitude, height },
    heightSource: source,
  };
}

/**
 * Builds a GeoPoint for a plane, preferring geometric (GNSS) altitude over
 * barometric. Returns null when there is no usable position or altitude,
 * or when the plane is on the ground.
 */
export function planeToGeoPoint(plane: Plane): {
  point: GeoPoint;
  altitudeSource: PlaneAltitudeSource;
} | null {
  const { lat, lon, geo_altitude, baro_altitude, on_ground } = plane;

  if (on_ground || lat === null || lon === null) return null;

  if (geo_altitude !== null) {
    return { point: { lat, lon, height: geo_altitude }, altitudeSource: "geo" };
  }
  if (baro_altitude !== null) {
    return { point: { lat, lon, height: baro_altitude }, altitudeSource: "baro" };
  }
  return null;
}