import type { Plane } from "../types/planes.ts";

const toRad = (deg: number) => deg * (Math.PI / 180);
const toDeg = (rad: number) => rad * (180 / Math.PI);

const R = 6371000;
const MAX_DT = 60;

export function predictPlane(plane: Plane, nowSec: number): Plane {
  if (plane.time_position == null || plane.velocity == null || plane.heading == null || plane.on_ground) return plane;

  const dt = Math.min(Math.max(nowSec - plane.time_position, 0), MAX_DT);

  // flat earth approx
  const theta = toRad(plane.heading);
  const dNorth = plane.velocity * Math.cos(theta) * dt;
  const dEast = plane.velocity * Math.sin(theta) * dt;

  const dLat = toDeg(dNorth / R);
  const dLon = toDeg(dEast / (R * Math.cos(toRad(plane.lat))));

  const baro_altitude =
    plane.baro_altitude != null && plane.vertical_rate != null
      ? plane.baro_altitude + plane.vertical_rate * dt
      : plane.baro_altitude;

  return {
    ...plane,
    lat: plane.lat + dLat,
    lon: plane.lon + dLon,
    baro_altitude,
  };
}