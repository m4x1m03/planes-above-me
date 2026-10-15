import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { ENU, GeoPoint } from "./lookAngles";

export function observerPoint(coords: Coords): GeoPoint {
  return {
    lat: coords.latitude,
    lon: coords.longitude,
    height: coords.altitude ?? 0,
  };
}

export function planePoint(plane: Plane): GeoPoint {
  return {
    lat: plane.lat,
    lon: plane.lon,
    height: plane.geo_altitude ?? plane.baro_altitude ?? 0,
  };
}

export function toRadarXY(enu: ENU, rangeKm: number, radiusPx: number): { x: number; y: number }{
  const rangeM = 1000*rangeKm;
  const pixPerMeter = radiusPx / rangeM;
  return{
    x : enu.e * pixPerMeter,
    y : -enu.n * pixPerMeter,
  }
}

export function horizontalDistanceM(enu: ENU): number{
  return Math.hypot(enu.e,enu.n);
}

export function isInRange(enu: ENU, rangeKm: number): boolean{
  return horizontalDistanceM(enu) <= 1000*rangeKm;
}

