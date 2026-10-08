import { ALTITUDE_STOPS } from "../libs/planeStyle";

const MIN_ALT = ALTITUDE_STOPS[0][0];
const MAX_ALT = ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1][0];

const GRADIENT = `linear-gradient(90deg, ${ALTITUDE_STOPS
  .map(([alt, color]) => `${color} ${((alt - MIN_ALT) / (MAX_ALT - MIN_ALT)) * 100}%`)
  .join(', ')})`;

export function AltitudeLegend() {
  return (
    <div
      role="img"
      aria-label={`Plane colour shows altitude, from ${MIN_ALT} m to ${MAX_ALT} m and above`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: '#9ba5b0',
      }}
    >
      <span aria-hidden="true">{MIN_ALT} m</span>
      <span aria-hidden="true" style={{ width: 200, height: 6, borderRadius: 3, background: GRADIENT }} />
      <span aria-hidden="true">{MAX_ALT}+ m</span>
    </div>
  );
}