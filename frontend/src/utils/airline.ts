import type { Plane } from '../types/planes';

/** "Air France", or "ZZZ" for an unknown code, or null for GA/no callsign */
export const airlineLabel = (plane: Plane): string | null =>
  plane.airline?.name ?? plane.airline?.icao ?? null;

/** "AIRFRANS 1234" when the radio name is known, otherwise the raw callsign */
export const spokenCallsign = (plane: Plane): string | null => {
  const cs = plane.callsign?.trim();
  if (!cs) return null;
  const telephony = plane.airline?.telephony;
  return telephony ? `${telephony} ${cs.slice(3)}` : cs;
};