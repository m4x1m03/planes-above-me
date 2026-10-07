import type { ENU } from "./lookAngles";

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

