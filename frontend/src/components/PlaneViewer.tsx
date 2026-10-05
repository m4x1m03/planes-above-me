import { useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { usePlanes } from "../hooks/usePlanes";
import { GeolocationPrompt } from "./GeolocationPrompt";
import { PlaneInfoPanel } from "./PlaneInfoPanel";
import MapView from "./MapView";

function PlaneViewer(){
  const { coords, status, error, retry } = useGeolocation();
  const { planesRef, planeSnapshot } = usePlanes(coords);
  const [selectedPlaneID, setSelectedPlaneID] = useState<string | null>(null);

  const selectedPlaneData = planeSnapshot.find((planeData) => planeData.icao24 === selectedPlaneID);

  return(
    <>
      <MapView
        coords={coords}
        planesRef={planesRef}
        selectedPlaneID={selectedPlaneID}
        onSelectPlane={setSelectedPlaneID}
      />
      <GeolocationPrompt status={status} error={error} retry={retry} />
      {selectedPlaneData && <PlaneInfoPanel plane={selectedPlaneData} observerCoords={coords} onClose={() => setSelectedPlaneID(null)}/>}
    </>
  )
}
export default PlaneViewer;