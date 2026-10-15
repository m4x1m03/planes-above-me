import type { Plane } from "../types/planes";

// OpenSky pads callsigns with spaces and sometimes sends none at all
export function planeLabel(plane: Plane): string {
  return plane.callsign?.trim() || plane.icao24;
}