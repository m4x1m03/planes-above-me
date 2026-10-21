import type { RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { View } from "../types/views";
import { COMPACT_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import RadarScope from "./RadarScope";
import { RangeControl } from "./RangeControl";
import { AltitudeLegend } from "./AltitudeLegend";
import { StripList } from "./StripList";
import { DataAttribution } from "./DataAttribution"; 

interface RadarViewProps {
  coords: Coords | null;
  rangeKm: number;
  rangeSteps: readonly number[];
  planesRef: RefObject<Plane[]>;
  planeSnapshot: Plane[];
  selectedPlaneID: string | null;
  onSelectPlane: (id: string | null) => void;
  onRangeChange: (km: number) => void;
  onRequestView: (view: View) => void;
}

function RadarView({coords, rangeKm, rangeSteps, planesRef, planeSnapshot, selectedPlaneID, onSelectPlane, onRangeChange, onRequestView}: RadarViewProps) {
  const compact = useMediaQuery(COMPACT_QUERY);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#0d1117",
        color: "#9ba5b0",
        display: "flex",
        flexDirection: compact ? "column" : "row",
      }}
    >
      {/* Radar column */}
      <div
        style={{
          flex: compact ? "none" : 2,
          minWidth: 0,
          boxSizing: "border-box",
          padding: compact ? "16px 16px 12px" : 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: compact ? 8 : 16,
        }}
      >
        {/* Same height as the fixed view switcher, so the scope starts below it */}
        <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "flex-end", minHeight: 52 }}>
          <RangeControl rangeKm={rangeKm} steps={rangeSteps} onChange={onRangeChange} compact={compact} />
        </div>

        <div
          style={{
            // Phone: cap the scope so the list keeps at least half the screen
            width: compact ? "min(100%, 42dvh)" : "min(100%, calc(100dvh - 140px))",
          }}
        >
          <RadarScope
            coords={coords}
            rangeKm={rangeKm}
            planesRef={planesRef}
            selectedPlaneID={selectedPlaneID}
            onSelectPlane={onSelectPlane}
          />
        </div>

        {compact ? (
          <DataAttribution />
        ) : (
          <div
            style={{
              alignSelf: "stretch",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
            }}
          >
            <AltitudeLegend />
            <DataAttribution />
          </div>
        )}
      </div>

      {/* Strip list */}
      <div
        style={{
          flex: 1,
          minWidth: compact ? 0 : 320,
          minHeight: 0,
          display: "flex",
        }}
      >
        <StripList
          coords={coords}
          rangeKm={rangeKm}
          planeSnapshot={planeSnapshot}
          selectedPlaneID={selectedPlaneID}
          onSelectPlane={onSelectPlane}
          onRequestView={onRequestView}
          compact={compact}
        />
      </div>
    </div>
  );
}

export default RadarView;