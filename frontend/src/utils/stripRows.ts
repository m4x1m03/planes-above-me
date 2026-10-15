import type { Plane } from "../types/planes";
import { computeENU, lookAnglesFromENU, type GeoPoint } from "./lookAngles";
import { horizontalDistanceM, isInRange, planePoint } from "./radarGeometry";

export type SortKey = 'distance' | 'icao';

export interface StripRow {
  plane: Plane;
  distanceKm: number;
  azimuthDeg: number;
  elevationDeg: number;
}

export function buildStripRows(
  planes: Plane[],
  observer: GeoPoint | null,
  rangeKm: number,
  sort: SortKey,
): StripRow[]{
  if(!observer) return [];
  const rows: StripRow[] = [];
  for(const p of planes){
    const enu = computeENU(observer, planePoint(p));
    if (!isInRange(enu, rangeKm)) continue;
    const angles = lookAnglesFromENU(enu);
    rows.push({plane:p, distanceKm:horizontalDistanceM(enu)/1000, azimuthDeg:angles.azimuthDeg, elevationDeg:angles.elevationDeg});
  }
  rows.sort((a, b) =>
    sort === "distance"
      ? a.distanceKm - b.distanceKm || a.plane.icao24.localeCompare(b.plane.icao24)
      : a.plane.icao24.localeCompare(b.plane.icao24),
  );
  return rows;
}