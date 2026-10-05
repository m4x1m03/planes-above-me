import { useEffect, useRef, useState, type RefObject } from "react";
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePredictionLoop } from "../hooks/usePredictionLoop";
import plane from '../assets/plane-icon.png';
import type { Coords } from "../hooks/useGeolocation";
import type { Plane } from "../types/planes";
import { planesToGeoJSON } from "../utils/planesToGeoJSON";
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(maplibreWorkerUrl);

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

interface MapViewProps {
  coords: Coords | null;
  planesRef: RefObject<Plane[]>;
  selectedPlaneID: string | null;
  onSelectPlane: (id: string | null) => void;
}

function MapView({ coords, planesRef, selectedPlaneID, onSelectPlane }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

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
      mapRef.current!.addSource('user-location', {
        'type' : 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': []
        },
      })
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
          'icon-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#fbd100', ['interpolate-hcl', ['linear'], ['coalesce', ['get', 'baro_altitude'], 0], 0,'#ff3838', 3000, '#b6ff38', 6000, '#38ffee', 9000, '#7738ff']]
        }
      });
      mapRef.current!.addLayer(
        {
          'id': 'user-location-layer',
          'type': 'circle',
          'source': 'user-location',
          'paint': {
            'circle-radius': 7,
            'circle-color': '#3d9bff',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#e6edf3',
          },
        },
        'planes-layer'
      );
      setMapLoaded(true);
    })

    mapRef.current.on('click', 'planes-layer', (e) => {
      onSelectPlane(e.features![0].properties.icao24);
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
      mapRef.current = null;
    }
  }, [])

  useEffect(() => {
    if(!coords) return;
    if(!mapRef.current) return;

    mapRef.current.flyTo({center:[coords.longitude, coords.latitude], zoom:12});
  }, [coords])

  useEffect(() => {
    if (!coords) return;
    if (!mapLoaded) return;

    mapRef.current?.getSource<maplibregl.GeoJSONSource>('user-location')?.setData({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude],
      },
      properties: {},
    });
  }, [coords, mapLoaded]);

  usePredictionLoop(planesRef, (predicted) => {
    mapRef.current
      ?.getSource<maplibregl.GeoJSONSource>('planes')
      ?.setData(planesToGeoJSON(predicted));
  }, mapLoaded);

  useEffect(() => {
      if(!mapRef.current) return;
      if(!mapLoaded) return;
      if(selectedPlaneID){
        mapRef.current.setFeatureState(
          { source: 'planes', id: selectedPlaneID },
          { selected: true }
        );

        return () => {
          mapRef.current?.setFeatureState(
            { source: 'planes', id: selectedPlaneID },
            { selected: false }
          );
        }
      }
    }, [selectedPlaneID, mapLoaded]);

  return(
    <>
      <div
        ref={containerRef}
        style={{width: '100vw', height: '100dvh'}}
      />
    </>
  )
}

export default MapView;