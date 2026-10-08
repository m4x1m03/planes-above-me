import type { RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import type { View } from "../types/views";
import RadarScope from "./RadarScope";

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

function RadarView(_props: RadarViewProps) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#0d1117',
        color: '#9ba5b0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 'min(90vw, 90dvh)' }}>
        <RadarScope
          coords={_props.coords}
          rangeKm={_props.rangeKm}
          planesRef={_props.planesRef}
          selectedPlaneID={_props.selectedPlaneID}
          onSelectPlane={_props.onSelectPlane}
        />
      </div>
    </div>
  );
}

export default RadarView;