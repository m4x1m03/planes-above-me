import { useEffect, useState } from "react";

export type GeolocationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'denied'
  | 'error'
  | 'unsupported';

export interface Coords {
  latitude: number,
  longitude: number,
  altitude: number | null,
  altitude_accuracy: number | null,
  accuracy: number | null
}

interface UseGeolocResult {
  coords: Coords | null,
  status: GeolocationStatus,
  error: string | null,
  retry: () => void
}

export function useGeolocation(): UseGeolocResult{
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const retry = () => {
    setRetryCount((prev) => prev +1);
  }

  useEffect(() => {
    if(!navigator.geolocation){
      setStatus('unsupported');
      setError("Browser does not support geolocation");
      return;
    }

    setStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude, 
          longitude: position.coords.longitude, 
          altitude: position.coords.altitude, 
          altitude_accuracy: position.coords.altitudeAccuracy, 
          accuracy: position.coords.accuracy});
        setStatus('success');
      },
      (error) => {
        switch (error.code){
          case error.PERMISSION_DENIED:
            setStatus('denied');
            setError("Acces to location was denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus('error');
            setError("No position data available, retry later");
            break;
          case error.TIMEOUT:
            setStatus('error');
            setError("timeout exceeded");
            break;
          default:
            setStatus('error');
            setError("Whoops, an uncaught error happened")
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000,
      },
    );

  }, [retryCount]);


  return{coords, status, error, retry};
}