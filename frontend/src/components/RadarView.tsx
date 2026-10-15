import type { RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { View } from "../types/views";
import RadarScope from "./RadarScope";
import { RangeControl } from "./RangeControl";
import { AltitudeLegend } from "./AltitudeLegend";
import { StripList } from "./StripList";

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

function RadarView({coords, rangeKm, rangeSteps, planesRef, planeSnapshot, selectedPlaneID, onSelectPlane, onRangeChange, onRequestView,}: RadarViewProps) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#0d1117',
        color: '#9ba5b0',
        display: 'flex',
      }}
    >
      {/* Radar column: left 2/3 */}
      <div
        style={{
          flex: 2,
          minWidth: 0,
          boxSizing: 'border-box',
          padding: 24,
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

        <div style={{ alignSelf: 'stretch', display: 'flex' }}>
          <AltitudeLegend />
        </div>
      </div>

      {/* Strip list: right 1/3 */}
      <div style={{ flex: 1, minWidth: 320, display: 'flex' }}>
        <StripList
          coords={coords}
          rangeKm={rangeKm}
          planeSnapshot={planeSnapshot}
          selectedPlaneID={selectedPlaneID}
          onSelectPlane={onSelectPlane}
          onRequestView={onRequestView}
        />
      </div>
    </div>
  );
}

export default RadarView;