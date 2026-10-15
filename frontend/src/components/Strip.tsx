import type { StripRow } from "../utils/stripRows";
import { planeColor, SELECTED_COLOR } from "../libs/planeStyle";
import {
  flightLevel,
  formatBearing,
  formatNumber,
  metersToFeet,
  msToFpm,
  msToKnots,
  orDash,
  trendArrow,
} from "../utils/units";
import { planeLabel } from "../utils/planeLabel";

const MONO = "'JetBrains Mono', monospace";
const MUTED = "#9ba5b0";

interface StripProps {
  row: StripRow;
  selected: boolean;
  onToggle: () => void;
  onShowOnMap: () => void;
}

// "+1,280 fpm" when climbing, "-640 fpm" descending, "0 fpm" level
function formatVerticalRate(ms: number) {
  const fpm = msToFpm(ms);
  const sign = Math.round(fpm / 10) > 0 ? "+" : "";
  return `${sign}${formatNumber(fpm, 10)} fpm`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const ACTION_BUTTON = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 8,
  font: "inherit",
  fontSize: 14,
  cursor: "pointer",
} as const;

// Small arrow pointing along the bearing from you to the plane (0° = up = north)
function BearingArrow({ deg }: { deg: number }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{ transform: `rotate(${deg}deg)` }}
    >
      <path d="M6 1 L10.5 11 L6 8.5 L1.5 11 Z" fill={MUTED} />
    </svg>
  );
}

export function Strip({ row, selected, onToggle, onShowOnMap }: StripProps) {
  const { plane, distanceKm, azimuthDeg, elevationDeg } = row;

  return (
    <div
      data-icao24={plane.icao24}
      style={{
        flexShrink: 0,
        scrollMarginBlock: 8,
        background: "#161b22",
        border: `1.5px solid ${selected ? SELECTED_COLOR : "#30363d"}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={selected}
        onClick={onToggle}
        style={{
          width: "100%",
          minHeight: 60,
          margin: 0,
          padding: "10px 14px",
          border: 0,
          background: "transparent",
          color: "#e6edf3",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Identity */}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.01em" }}>
            {planeLabel(plane)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: MUTED,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {/* Swap for airline · type once the Plane type carries them */}
            {plane.icao24}
          </span>
        </span>

        {/* Altitude */}
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 13 }}>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: planeColor(plane.baro_altitude, false),
            }}
          />
          {orDash(plane.baro_altitude, flightLevel)}
          <span style={{ color: MUTED }} aria-hidden="true">
            {orDash(plane.vertical_rate, trendArrow)}
          </span>
        </span>

        {/* Distance and bearing */}
        <span
          style={{
            minWidth: 72,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
            fontFamily: MONO,
          }}
        >
          <span style={{ fontSize: 16 }}>
            {distanceKm.toFixed(1)}
            <span style={{ fontSize: 11, color: MUTED }}> km</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED }}>
            <BearingArrow deg={azimuthDeg} />
            {formatBearing(azimuthDeg)}
          </span>
        </span>
      </button>

      {selected && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              borderTop: "1px solid #30363d",
              paddingTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "12px 10px",
            }}
          >
            <Detail
              label="Altitude"
              value={orDash(plane.baro_altitude, (m) => `${formatNumber(metersToFeet(m), 100)} ft`)}
            />
            <Detail label="Vertical" value={orDash(plane.vertical_rate, formatVerticalRate)} />
            <Detail
              label="Speed"
              value={orDash(plane.velocity, (v) => `${formatNumber(msToKnots(v))} kt`)}
            />
            <Detail label="Azimuth" value={formatBearing(azimuthDeg)} />
            <Detail label="Elevation" value={`${elevationDeg.toFixed(0)}°`} />
            <Detail label="Heading" value={orDash(plane.heading, formatBearing)} />
            <Detail label="ICAO24" value={plane.icao24} />
            {/* Add a Registration cell here once the Plane type carries it */}
            <Detail label="Squawk" value={plane.squawk ?? "—"} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={onShowOnMap}
              style={{
                ...ACTION_BUTTON,
                border: 0,
                background: SELECTED_COLOR,
                color: "#0d1117",
                fontWeight: 600,
              }}
            >
              Show on map
            </button>
            <button
              type="button"
              disabled
              title="Coming with the dome view"
              style={{
                ...ACTION_BUTTON,
                border: "1px solid #30363d",
                background: "transparent",
                color: "#e6edf3",
                fontWeight: 500,
                opacity: 0.4,
                cursor: "default",
              }}
            >
              Find in sky
            </button>
          </div>
        </div>
      )}
    </div>
  );
}