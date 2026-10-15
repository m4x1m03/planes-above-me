// OpenSky units: altitude in meters, velocity in m/s, heading in degrees (0 = north)

const numberFormat = new Intl.NumberFormat();

export const metersToFeet = (meters: number) => meters * 3.28084;
export const msToKnots = (ms: number) => ms * 1.943844;
export const msToKmh = (ms: number) => ms * 3.6;
export const msToFpm = (ms: number) => ms * 196.85;

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function degreesToCompass(degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

// Rounds to the nearest `step` and adds the user's locale separators (35,000 / 35 000)
export function formatNumber(value: number, step = 1) {
  return numberFormat.format(Math.round(value / step) * step || 0);
}

export function flightLevel(meters: number) {
  const fl = Math.round(metersToFeet(meters) / 100);
  return `FL${String(Math.max(fl, 0)).padStart(3, "0")}`;
}

// 40.4 → "040°", 359.6 → "000°", -90 → "270°"
export function formatBearing(degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  return `${String(Math.round(normalized) % 360).padStart(3, "0")}°`;
}

// Dead band so level planes don't flicker between climbing and descending
const LEVEL_BAND_MS = 0.5;

export function trendArrow(verticalRateMs: number) {
  if (verticalRateMs > LEVEL_BAND_MS) return "↗";
  if (verticalRateMs < -LEVEL_BAND_MS) return "↘";
  return "→";
}

// One place to handle OpenSky's nulls: orDash(plane.baro_altitude, flightLevel)
export function orDash<T>(value: number | null | undefined, format: (v: number) => T): T | string {
  return value == null ? "—" : format(value);
}