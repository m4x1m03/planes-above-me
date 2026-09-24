import { useEffect } from "react";
import "./PlaneInfoPanel.css";

type PlaneInfoPanelProps = {
  icao24: string;
  onClose: () => void;
};

export function PlaneInfoPanel({ icao24, onClose }: PlaneInfoPanelProps) {
  // Close with the Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <aside className="plane-panel" aria-label="Plane details">
      <header className="plane-panel__header">
        <div>
          <p className="plane-panel__hint">Transponder code</p>
          <h2 className="plane-panel__ident">{icao24}</h2>
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

      <dl className="plane-panel__details">
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
        <div className="plane-panel__row">
          <dt>In the air</dt>
          <dd>—</dd>
        </div>
      </dl>
    </aside>
  );
}