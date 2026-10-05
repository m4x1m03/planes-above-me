import { useEffect, useRef, type RefObject } from "react";
import type { Plane } from "../types/planes";
import { predictPlane } from "../utils/predictPlane";

export function usePredictionLoop(
  planesRef: RefObject<Plane[]>,
  onFrame: (predicted: Plane[]) => void,
  enabled: boolean,
  intervalMs = 150,
): void {
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    if(!enabled) return;
    let frameId: number;
    let lastUpdate = 0;

    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      if(now-lastUpdate<intervalMs) return;
      lastUpdate=now;
      
      const nowSec = Date.now() / 1000;
      const predicted = planesRef.current.map(p => predictPlane(p, nowSec));
      onFrameRef.current(predicted);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled, intervalMs, planesRef]) 

}