import { useEffect, useState } from "react";

type GeolocationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'denied'
  | 'error'
  | 'unsupported';

interface Coords {
  latitude: number,
  longitude: number,
}

interface UseGeolocResult {
  coords: Coords | null,
  status: GeolocationStatus,
  error: string | null
}

export function useGeolocation(): UseGeolocResult{
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if(!navigator.geolocation){
      setStatus('unsupported');
      setError("Browser does not support geolocation");
      return;
    }

    setStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({latitude: position.coords.latitude, longitude: position.coords.longitude});
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
      }
    );

  }, []);


  return{coords, status, error};
}