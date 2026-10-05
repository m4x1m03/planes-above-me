import { useEffect, useRef, useState, type RefObject } from "react";
import type { Coords } from "./useGeolocation";
import type { Plane } from "../types/planes";
import { fetchPlanes } from "../utils/fetchPlanes";

interface UsePlanesResult {
  planesRef: RefObject<Plane[]>;
  planeSnapshot: Plane[];
}

export function usePlanes(coords: Coords | null): UsePlanesResult{
  const planesRef = useRef<Plane[]>([]);
  const [planeSnapshot, setPlaneSnapshot] = useState<Plane[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!coords) return;

    const bbox = { lamin: coords.latitude-1, lomin: coords.longitude-2, lamax: coords.latitude+1, lomax: coords.longitude+2 };

    const updatePlanes = async () => {
      try {
        const planes = await fetchPlanes(bbox);
        if(cancelled) return;
        planesRef.current = planes;
        setPlaneSnapshot(planes);
      } catch (error) {
        console.error(error);
      }
    };
    
    updatePlanes();
    const intervalId = setInterval(updatePlanes, 10000);

    return () => {
        cancelled = true;
        clearInterval(intervalId);
    };
  }, [coords?.latitude, coords?.longitude]);

  return {planesRef, planeSnapshot}
}