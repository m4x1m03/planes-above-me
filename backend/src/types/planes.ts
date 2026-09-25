export type Plane = {
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  velocity: number | null;
  vertical_rate: number | null;
  altitude: number | null;
  on_ground: boolean;
  timestamp: number;
}