import { useEffect, useRef, useState } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from "../hooks/useGeolocation";
import { GeolocationPrompt } from "./GeolocationPrompt";
import plane from '../assets/plane-icon.png';
import { planesToGeoJSON } from "../utils/planesToGeoJSON";
import { fetchPlanes } from "../utils/fetchPlanes";
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { PlaneInfoPanel } from "./PlaneInfoPanel";

setWorkerUrl(maplibreWorkerUrl);

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { coords, status, error, retry } = useGeolocation();
  const [selectedPlane, setSelectedPlane] = useState<string | null>(null);

  useEffect(() => {
    if(!containerRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/01a0d2f1-5f3a-7989-b049-d7e03743420c/style.json?key=${MAPTILER_KEY}`,
      center: [2.349014, 48.864716],
      zoom: 10,
    })

    mapRef.current.on('load', async () => {
      const image = await mapRef.current!.loadImage(plane);
      mapRef.current!.addImage('planes', image.data, {sdf: true, pixelRatio : 10});
      mapRef.current!.addSource('planes', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': []
        },
        'promoteId' : 'icao24'
      });
      mapRef.current!.addLayer({
        'id': 'planes-layer',
        'type': 'symbol',
        'source': 'planes',
        'layout': {
          'icon-image': 'planes',
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'heading']
        },
        'paint' : {
          'icon-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#fbd100', ['interpolate', ['linear'], ['coalesce', ['get', 'altitude'], 0], 0,'#ff3838', 3000, '#b6ff38', 6000, '#38ffee', 9000, '#7738ff']]
        }
      });
    })

    mapRef.current.on('click', 'planes-layer', (e) => {
      setSelectedPlane(e.features![0].properties.icao24);
      console.log(e.features![0].properties);
    });

    mapRef.current.on('mouseenter', 'planes-layer', () => {
      mapRef.current!.getCanvas().style.cursor='pointer';
    });

    mapRef.current.on('mouseleave', 'planes-layer', () => {
      mapRef.current!.getCanvas().style.cursor='';
    });

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

  useEffect(() => {
      if(!mapRef.current) return;
      if(!mapRef.current.getSource('planes')) return;
      if(selectedPlane){
        mapRef.current.setFeatureState(
          { source: 'planes', id: selectedPlane },
          { selected: true }
        );

        return () => {
          mapRef.current?.setFeatureState(
            { source: 'planes', id: selectedPlane },
            { selected: false }
          );
        }
      }
    }, [selectedPlane]);

  return(
    <>
      <div
        ref={containerRef}
        style={{width: '100vw', height: '100dvh'}}
      />
      <GeolocationPrompt status={status} error={error} retry={retry} />
      {selectedPlane && <PlaneInfoPanel icao24={selectedPlane} onClose={() => setSelectedPlane(null)}/>}
    </>
  )
}

export default Map;