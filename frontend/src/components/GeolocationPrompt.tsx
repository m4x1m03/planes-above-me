import { useGeolocation, type GeolocationStatus } from "../hooks/useGeolocation";

interface GeolocationPromptProps{
  status: GeolocationStatus,
  error: string | null,
  retry: () => void
}

export function GeolocationPrompt({status, error, retry}: GeolocationPromptProps){
  switch(status){
    case 'denied':
      return(
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
        <p>Turn on your location setting in your browser</p>
        </div>
      );
    case 'error':
      return(
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
        <p>{error}</p>
        <button onClick={retry}>Retry</button>
        </div>
      );
    case 'unsupported':
      return(
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
        <p>Your browser does not support location, please enter your location manually</p>
        </div>
      );
    default:
      return null;
  }
}