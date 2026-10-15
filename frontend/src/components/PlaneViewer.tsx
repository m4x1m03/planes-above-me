import { useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { usePlanes } from "../hooks/usePlanes";
import { GeolocationPrompt } from "./GeolocationPrompt";
import { PlaneInfoPanel } from "./PlaneInfoPanel";
import type { View } from "../types/views";
import {ViewSwitcher} from "./ViewSwitcher";
import MapView from "./MapView";
import RadarView from "./RadarView";

//constants for ranges
const RANGE_STEPS_KM = [10, 25, 50, 100] as const;
const DEFAULT_RANGE_KM = 50;


function PlaneViewer(){
  const { coords, status, error, retry } = useGeolocation();
  const { planesRef, planeSnapshot } = usePlanes(coords);
  const [selectedPlaneID, setSelectedPlaneID] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  const [rangeKm, setRangeKm] = useState<number>(DEFAULT_RANGE_KM);

  const selectedPlaneData = planeSnapshot.find((planeData) => planeData.icao24 === selectedPlaneID);

  const renderView = () => {
    switch (view) {
      case 'map':
        return (
          <MapView
            coords={coords}
            planesRef={planesRef}
            selectedPlaneID={selectedPlaneID}
            onSelectPlane={setSelectedPlaneID}
          />
        );
      case 'radar':
        return (
          <RadarView
            coords={coords}
            rangeKm={rangeKm}
            rangeSteps={RANGE_STEPS_KM}
            planesRef={planesRef}
            planeSnapshot={planeSnapshot}
            selectedPlaneID={selectedPlaneID}
            onSelectPlane={setSelectedPlaneID}
            onRangeChange={setRangeKm}
            onRequestView={setView}
          />
        );
      case 'dome':
        return (
          <div style={{ width: '100vw', height: '100dvh', background: '#0d1117', color: '#9ba5b0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Dome view coming soon
          </div>
        );
    }
  };

  return(
    <>
      {renderView()}
      <ViewSwitcher view={view} onChange={setView} />
      <GeolocationPrompt status={status} error={error} retry={retry} />
      {view === 'map' && selectedPlaneData && (
        <PlaneInfoPanel
          plane={selectedPlaneData}
          observerCoords={coords}
          onClose={() => setSelectedPlaneID(null)}
        />
      )}
    </>
  )
}
export default PlaneViewer;