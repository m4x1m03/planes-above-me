import type { Airline } from "./types.js";

export function resolveAirline(
  callsign: string | null | undefined,
  airlines: Map<string, Airline>,
): Airline | null {
  const match = callsign?.trim().toUpperCase().match(/^([A-Z]{3})\d/);
  if(!match) return null;
  const code = match[1]!;
  const result = airlines.get(code);
  return result ?? {icao:code, name: null, telephony: null, country: null };
}