import { useEffect, useRef } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from "../hooks/useGeolocation";
import { GeolocationPrompt } from "./GeolocationPrompt";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { coords, status, error, retry } = useGeolocation();

  useEffect(() => {
    if(!containerRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/basic/style.json?key=${MAPTILER_KEY}`,
      center: [2.349014, 48.864716],
      zoom: 10,
    })

    mapRef.current.on('error', (e) => {
      console.error('MapLibre error:', e)
    })

    return () => {
      mapRef.current?.remove();

    }
  }, [])

  useEffect(() => {
    if(!coords) return;
    if(!mapRef.current) return;

    mapRef.current.flyTo({center:[coords.longitude, coords.latitude], zoom:12});
  }, [coords])

  return(
    <>
      <div
        ref={containerRef}
        style={{width: '100vw', height: '100dvh'}}
      />
      <GeolocationPrompt status={status} error={error} retry={retry} />
    </>
  )
}

export default Map;