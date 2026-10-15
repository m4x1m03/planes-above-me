import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { View } from "../types/views";
import { observerPoint } from "../utils/radarGeometry";
import { buildStripRows, type SortKey } from "../utils/stripRows";
import { Strip } from "./Strip";

const MUTED = "#9ba5b0";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "distance", label: "Distance" },
  { key: "icao", label: "ICAO" },
];

const sortButton = (active: boolean): CSSProperties => ({
  minHeight: 40,
  padding: "0 14px",
  border: 0,
  borderRadius: 6,
  background: active ? "#e6edf3" : "transparent",
  color: active ? "#0d1117" : MUTED,
  font: "inherit",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
});

interface StripListProps {
  coords: Coords | null;
  rangeKm: number;
  planeSnapshot: Plane[];
  selectedPlaneID: string | null;
  onSelectPlane: (id: string | null) => void;
  onRequestView: (view: View) => void;
}

export function StripList({
  coords,
  rangeKm,
  planeSnapshot,
  selectedPlaneID,
  onSelectPlane,
  onRequestView,
}: StripListProps) {
  const [sort, setSort] = useState<SortKey>("distance");

  const observer = useMemo(() => (coords ? observerPoint(coords) : null), [coords]);

  const rows = useMemo(
    () => buildStripRows(planeSnapshot, observer, rangeKm, sort),
    [planeSnapshot, observer, rangeKm, sort],
  );

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedPlaneID) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-icao24="${selectedPlaneID}"]`);
    if (!el) return; // selected plane is outside the range, so it has no strip

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedPlaneID]);

  const count = `${rows.length} ${rows.length === 1 ? "plane" : "planes"} within ${rangeKm} km`;

  return (
    <section
      aria-label="Planes in range"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        background: "#0f141b",
        borderLeft: "1px solid #21262d",
        color: "#e6edf3",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 20px 14px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>In range</h2>
          <span style={{ fontSize: 13, color: MUTED }}>{count}</span>
        </div>

        <div
          role="group"
          aria-label="Sort planes"
          style={{
            display: "flex",
            padding: 3,
            gap: 2,
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
          }}
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              style={sortButton(sort === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <p style={{ margin: 0, padding: "4px 20px 24px", fontSize: 14, color: MUTED }}>
          {coords ? `No planes within ${rangeKm} km` : "Waiting for your location…"}
        </p>
      ) : (
        <div
          ref={listRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "4px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {rows.map((row) => {
            const id = row.plane.icao24;
            const selected = id === selectedPlaneID;
            return (
              <Strip
                key={id}
                row={row}
                selected={selected}
                onToggle={() => onSelectPlane(selected ? null : id)}
                onShowOnMap={() => onRequestView("map")}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}