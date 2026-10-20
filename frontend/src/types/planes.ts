export type Airline = {
  icao: string;
  name: string | null;
  telephony: string | null;
  country: string | null;
};

export type Plane = {
  icao24: string;
  callsign: string | null;
  airline: Airline | null;
  lat: number;
  lon: number;
  heading: number | null;
  velocity: number;
  vertical_rate: number | null;
  baro_altitude: number | null;
  geo_altitude: number | null;
  on_ground: boolean;
  time_position: number | null;
  timestamp: number;
  squawk: string | null;
}