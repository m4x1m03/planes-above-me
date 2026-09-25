import { useEffect, type ReactNode } from "react";
import type { Plane } from "../types/planes.ts";
import {
  degreesToCompass,
  formatNumber,
  metersToFeet,
  msToKmh,
  msToKnots,
} from "../utils/units";
import "./PlaneInfoPanel.css";

type PlaneInfoPanelProps = {
  plane: Plane;
  onClose: () => void;
};

export function PlaneInfoPanel({ plane, onClose }: PlaneInfoPanelProps) {
  // Close with the Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const { altitude, velocity, heading, on_ground, vertical_rate } = plane;
  const callsign = plane.callsign?.trim() || null;

  // OpenSky vertical_rate is in m/s. Ignore tiny values so level flight doesn't flicker.
  const LEVEL_THRESHOLD = 0.5; // m/s, roughly 100 ft/min
  const trend =
    vertical_rate === null || Math.abs(vertical_rate) < LEVEL_THRESHOLD
      ? null
      : vertical_rate > 0
        ? "climbing"
        : "descending";

  return (
    <aside className="plane-panel" aria-label="Plane details">
      <header className="plane-panel__header">
        <div>
          <p className="plane-panel__hint">Transponder code</p>
          <h2 className="plane-panel__ident">{plane.icao24}</h2>
        </div>
        <button
          type="button"
          className="plane-panel__close"
          onClick={onClose}
          aria-label="Close plane details"
        >
          ×
        </button>
      </header>

      {/* Live readouts: refresh with every poll */}
      <dl className="plane-panel__readouts">
        {on_ground ? (
          <Readout label="Altitude" value="On the ground" />
        ) : (
          <Readout
            label="Altitude"
            value={altitude === null ? null : formatNumber(metersToFeet(altitude), 10)}
            unit="ft"
            secondary={altitude === null ? undefined : `${formatNumber(altitude, 10)} m`}
          >
            {altitude !== null && trend && (
              <svg
                className={`plane-panel__trend plane-panel__trend--${trend}`}
                viewBox="0 0 24 24"
                role="img"
                aria-label={trend === "climbing" ? "Climbing" : "Descending"}
              >
                <path
                  d="M12 4 L12 20 M5 11 L12 4 L19 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </Readout>
        )}

        <Readout
          label="Speed"
          value={velocity === null ? null : formatNumber(msToKnots(velocity))}
          unit="kn"
          secondary={velocity === null ? undefined : `${formatNumber(msToKmh(velocity))} km/h`}
        />

        <Readout
          label="Heading"
          value={heading === null ? null : `${Math.round(heading) % 360}°`}
          unit={heading === null ? undefined : degreesToCompass(heading)}
        >
          {heading !== null && (
            <svg
              className="plane-panel__heading-arrow"
              viewBox="0 0 24 24"
              style={{ transform: `rotate(${heading}deg)` }}
              aria-hidden="true"
            >
              <path d="M12 2 L19 21 L12 16.5 L5 21 Z" fill="currentColor" />
            </svg>
          )}
        </Readout>
      </dl>

      {/* Static details: filled in once the plane and airport tables exist */}
      <dl className="plane-panel__details">
        <div className="plane-panel__row">
          <dt>Callsign</dt>
          <dd className="plane-panel__callsign">{callsign ?? "—"}</dd>
        </div>
        <div className="plane-panel__row">
          <dt>Airline</dt>
          <dd>—</dd>
        </div>
        <div className="plane-panel__row">
          <dt>Aircraft</dt>
          <dd>—</dd>
        </div>
        <div className="plane-panel__row">
          <dt>From</dt>
          <dd>—</dd>
        </div>
        <div className="plane-panel__row">
          <dt>To</dt>
          <dd>—</dd>
        </div>
      </dl>
    </aside>
  );
}

type ReadoutProps = {
  label: string;
  value: string | null;
  unit?: string;
  secondary?: string;
  children?: ReactNode;
};

function Readout({ label, value, unit, secondary, children }: ReadoutProps) {
  return (
    <div className="plane-panel__readout">
      <dt>{label}</dt>
      <dd>
        <span className="plane-panel__reading">
          {children}
          <span className="plane-panel__value">{value ?? "—"}</span>
          {value !== null && unit && <span className="plane-panel__unit">{unit}</span>}
        </span>
        {value !== null && secondary && (
          <span className="plane-panel__secondary">{secondary}</span>
        )}
      </dd>
    </div>
  );
}