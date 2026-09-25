// OpenSky units: altitude in meters, velocity in m/s, heading in degrees (0 = north)

const numberFormat = new Intl.NumberFormat();

export const metersToFeet = (meters: number) => meters * 3.28084;
export const msToKnots = (ms: number) => ms * 1.943844;
export const msToKmh = (ms: number) => ms * 3.6;

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function degreesToCompass(degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

// Rounds to the nearest `step` and adds the user's locale separators (35,000 / 35 000)
export function formatNumber(value: number, step = 1) {
  return numberFormat.format(Math.round(value / step) * step);
}