export type Plane = {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  heading: number;
  velocity: number;
  vertical_rate: number;
  altitude: number;
  on_ground: boolean;
  timestamp: number;
}