export type Plane = {
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  velocity: number;
  vertical_rate: number | null;
  baro_altitude: number | null;
  geo_altitude: number | null;
  on_ground: boolean;
  timestamp: number;
}