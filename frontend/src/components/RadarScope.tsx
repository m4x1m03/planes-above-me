import { useEffect, useRef, type RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import { usePredictionLoop } from "../hooks/usePredictionLoop";
import { drawScope, drawUser, isCompact } from "../utils/radarDraw";

interface RadarScopeProps {
  coords: Coords | null;
  rangeKm: number;
  planesRef: RefObject<Plane[]>;
  selectedPlaneID: string | null;
  onSelectPlane: (id: string | null) => void;
}

function RadarScope({rangeKm, coords, planesRef, selectedPlaneID, onSelectPlane}:RadarScopeProps){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    //radar scope sizing
    const observer = new ResizeObserver((entries) => {
      const size = entries[0].contentRect.width;
      sizeRef.current = size;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  usePredictionLoop(planesRef, (predicted) => {
    const ctx = canvasRef.current?.getContext('2d');
    const size = sizeRef.current;
    if (!ctx || size === 0) return;

    drawScope(ctx, size, rangeKm, isCompact(size))
    // planes (from `predicted`) go here later
    drawUser(ctx, size)
  }, true);

  return(
    <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: '1', display: 'block' }}>
    </canvas>
  )
}
export default RadarScope;