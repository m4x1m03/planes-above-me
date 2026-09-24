import type {Feature, FeatureCollection} from 'geojson';
import type { Plane } from '../types/planes';

export function planesToGeoJSON(planes: Plane[]): FeatureCollection{
  const features: Feature[] = planes.map((plane) => ({
    'type': 'Feature',
    'geometry': {
      'type': 'Point',
      'coordinates': [plane.lon, plane.lat]
    },
    'properties': {
      'heading' : plane.heading,
      'icao24' : plane.icao24,
      'velocity': plane.velocity,
      'vertical_rate': plane.vertical_rate,
      'altitude' : plane.altitude,
      'on_ground' : plane.on_ground,
      'timestamp' : plane.timestamp
    }
  }));

  return{
    type: 'FeatureCollection',
    features
  };
}