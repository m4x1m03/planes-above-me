import { useEffect, useRef } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from "../hooks/useGeolocation";
import { GeolocationPrompt } from "./GeolocationPrompt";
import plane from '../assets/plane-icon.png';
import { planesToGeoJSON } from "../utils/planesToGeoJSON";
import type { Plane } from "../types/planes";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const mockPlanes: Plane[] = [
  {
    icao24: 'a1b2c3',
    lat: 48.926102,
    lon: 2.217800,
    heading: 0,
    velocity: 220,
    vertical_rate: 0,
    timestamp: Date.now(),
  },
  {
    icao24: 'd4e5f6',
    lat: 48.930500,
    lon: 2.225000,
    heading: 90,
    velocity: 250,
    vertical_rate: 5,
    timestamp: Date.now(),
  },
  {
    icao24: '789abc',
    lat: 48.921000,
    lon: 2.210000,
    heading: 180,
    velocity: 300,
    vertical_rate: -8,
    timestamp: Date.now(),
  },
  {
    icao24: 'def012',
    lat: 48.923800,
    lon: 2.230000,
    heading: 270,
    velocity: 180,
    vertical_rate: 0,
    timestamp: Date.now(),
  },
  {
    icao24: '345678',
    lat: 48.918500,
    lon: 2.221500,
    heading: 45,
    velocity: 400,
    vertical_rate: 12,
    timestamp: Date.now(),
  },
];

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

    mapRef.current.on('load', async () => {
      const image = await mapRef.current!.loadImage(plane);
      mapRef.current!.addImage('planes', image.data);
      mapRef.current!.addSource('planes', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': []
        }
        
      });
      mapRef.current!.addLayer({
        'id': 'planes-layer',
        'type': 'symbol',
        'source': 'planes',
        'layout': {
          'icon-image': 'planes',
          'icon-size': 0.2,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'heading']
        }
      });

      mapRef.current!.getSource<maplibregl.GeoJSONSource>('planes')?.setData(planesToGeoJSON(mockPlanes));

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