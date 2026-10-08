import type { RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { View } from "../types/views";
import RadarScope from "./RadarScope";
import { RangeControl } from "./RangeControl";
import { AltitudeLegend } from "./AltitudeLegend";

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

function RadarView({coords, rangeKm, rangeSteps, planesRef, selectedPlaneID, onSelectPlane, onRangeChange,}: RadarViewProps) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        boxSizing: 'border-box',
        padding: 24,
        background: '#0d1117',
        color: '#9ba5b0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'flex-end', minHeight: 52 }}>
        <RangeControl rangeKm={rangeKm} steps={rangeSteps} onChange={onRangeChange} />
      </div>

      <div style={{ width: 'min(100%, calc(100dvh - 140px))' }}>
        <RadarScope
          coords={coords}
          rangeKm={rangeKm}
          planesRef={planesRef}
          selectedPlaneID={selectedPlaneID}
          onSelectPlane={onSelectPlane}
        />
      </div>

      <div style={{ alignSelf: 'stretch', display: 'flex'}}>
        <AltitudeLegend />
      </div>
    </div>
  );
}

export default RadarView;