import type { Plane } from "../types/planes.js";

const FT_TO_M = 0.3048;
const KT_TO_MS = 1852 / 3600;
const FPM_TO_MS = FT_TO_M / 60;
const MAX_POSITION_AGE_S = 60;

export interface ReadsbAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  track?: number;
  true_heading?: number;
  gs?: number;
  baro_rate?: number;
  geom_rate?: number;
  alt_baro?: number | "ground";
  alt_geom?: number;
  seen_pos?: number;
  squawk?: string;
}

export function toPlane(ac: ReadsbAircraft, nowMs: number): Plane | null{
  if(ac.lat==null || ac.lon==null || ac.gs==null || ac.seen_pos==null || ac.seen_pos>MAX_POSITION_AGE_S){return null;}
  const on_ground = ac.alt_baro === "ground";
  const nowS = nowMs / 1000;
  const rate = ac.baro_rate ?? ac.geom_rate;
  return {
        icao24: ac.hex.toLowerCase(),
        callsign: typeof ac.flight === 'string' ? ac.flight.trim() || null : null,
        time_position: nowS-ac.seen_pos,
        lon: ac.lon,
        lat: ac.lat,
        baro_altitude: typeof ac.alt_baro === "number" ? ac.alt_baro*FT_TO_M : null,
        on_ground,
        velocity: ac.gs*KT_TO_MS,
        heading: ac.track ?? ac.true_heading ?? null,
        vertical_rate: typeof rate === "number" ? rate * FPM_TO_MS : null,
        geo_altitude: typeof ac.alt_geom === "number" ? ac.alt_geom*FT_TO_M : null,
        squawk: ac.squawk ?? null,
        timestamp: nowS,
    };
}