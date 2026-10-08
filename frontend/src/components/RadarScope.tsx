import { useEffect, useRef, type RefObject } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import { usePredictionLoop } from "../hooks/usePredictionLoop";
import { drawScope, drawUser, drawPlane, drawLabel, drawHalo, isCompact, scopeRadius, planeSizes } from "../utils/radarDraw";
import { computeENU } from "../utils/lookAngles";
import { toRadarXY, isInRange } from "../utils/radarGeometry";
import { planeColor, SELECTED_COLOR } from "../libs/planeStyle.ts";

interface RadarScopeProps {
  coords: Coords | null;
  rangeKm: number;
  planesRef: RefObject<Plane[]>;
  selectedPlaneID: string | null;
  onSelectPlane: (id: string | null) => void;
}

function label(plane: Plane): string {
  return plane.callsign?.trim() || plane.icao24;
}

function RadarScope({rangeKm, coords, planesRef, selectedPlaneID, onSelectPlane}:RadarScopeProps){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef(0);
  const drawnRef = useRef<{ id: string; x: number; y: number }[]>([]);

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

    const compact = isCompact(size);
    const r = scopeRadius(size);
    const c = size / 2; // canvas is square: centre x === centre y
    const { glyphPx, haloPx } = planeSizes(compact);

    drawScope(ctx, size, rangeKm, compact);

    const drawn: { id: string; x: number; y: number }[] = [];

    if (coords) {
      const observer = {
        lat: coords.latitude,
        lon: coords.longitude,
        height: coords.altitude ?? 0,
      };

      let selected: { plane: Plane; x: number; y: number } | null = null;

      for (const plane of predicted) {
        const enu = computeENU(observer, {
          lat: plane.lat,
          lon: plane.lon,
          height: plane.geo_altitude ?? plane.baro_altitude ?? 0,
        });
        if (!isInRange(enu, rangeKm)) continue;

        const offset = toRadarXY(enu, rangeKm, r);
        const x = c + offset.x;
        const y = c + offset.y;
        drawn.push({ id: plane.icao24, x, y });

        if (plane.icao24 === selectedPlaneID) {
          selected = { plane, x, y };
          continue;
        }

        drawPlane(ctx, x, y, plane.heading, planeColor(plane.baro_altitude, false), glyphPx);
        if (!compact) drawLabel(ctx, x, y, label(plane));
      }

      if (selected) {
        const { plane, x, y } = selected;
        drawHalo(ctx, x, y, haloPx);
        drawPlane(ctx, x, y, plane.heading, SELECTED_COLOR, glyphPx);
        drawLabel(ctx, x, y, label(plane), SELECTED_COLOR);
      }
    }

    drawnRef.current = drawn;
    drawUser(ctx, size);
  }, true);

  //click handler
  const HIT_RADIUS_PX = 20;
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let hitId: string | null = null;
    let best = HIT_RADIUS_PX;
    for (const p of drawnRef.current) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < best) {
        best = d;
        hitId = p.id;
      }
    }
    onSelectPlane(hitId);
  };

  return(
    <canvas ref={canvasRef} style={{ width: '100%', aspectRatio: '1', display: 'block' }} onClick={handleClick}>
    </canvas>
  )
}
export default RadarScope;