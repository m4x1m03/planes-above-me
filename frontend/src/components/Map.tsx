import { useEffect, useRef } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from "../hooks/useGeolocation";
import { GeolocationPrompt } from "./GeolocationPrompt";
import plane from '../assets/plane-icon.png';
import { planesToGeoJSON } from "../utils/planesToGeoJSON";
import { fetchPlanes } from "../utils/fetchPlanes";

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

    // temporary debug hook - remove once tiles are confirmed working
    ;(window as any).debugMap = mapRef.current;

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

  useEffect(() => {
    if (!coords) return;
    if (!mapRef.current) return;

    const bbox = { lamin: coords.latitude-1, lomin: coords.longitude-2, lamax: coords.latitude+1, lomax: coords.longitude+2 };

    const updatePlanes = async () => {
      const planes = await fetchPlanes(bbox);
      mapRef.current?.getSource<maplibregl.GeoJSONSource>('planes')?.setData(planesToGeoJSON(planes));
    };

    updatePlanes();
    const intervalId = setInterval(updatePlanes, 10000);

    return () => {
        clearInterval(intervalId);
    };
  }, [coords]);

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