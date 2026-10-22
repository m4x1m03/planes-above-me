import type { Plane } from '../types/planes.js';
import { ProviderError, type PlaneProvider } from './types.js';
import { toPlane, type ReadsbAircraft } from './readsb.js';

interface AdsbLolConfig {
  baseUrl: string;        // https://api.adsb.lol
  apiKey?: string | undefined;  // sent as x-api-key when set
  timeoutMs?: number;     // default 5000
  fetchFn?: typeof fetch; // default: global fetch, swapped out in tests
}

function hasHex(x: unknown): x is ReadsbAircraft {
  return typeof x === 'object' && x !== null && 'hex' in x && typeof x.hex === 'string';
}

export function unwrapAdsbLol(body: unknown): { aircraft: ReadsbAircraft[]; nowMs: number } {
  if (typeof body !== 'object' || body === null) throw new ProviderError('adsb.lol: response is not an object');
  if (!('now' in body) || typeof body.now !== 'number') throw new ProviderError('adsb.lol: missing or invalid "now"');
  if (!('ac' in body) || !Array.isArray(body.ac)) throw new ProviderError('adsb.lol: missing or invalid ac');
  return { aircraft: body.ac.filter(hasHex), nowMs: body.now };
}

export function createAdsbLolProvider(config: AdsbLolConfig): PlaneProvider {
  const { baseUrl, apiKey, timeoutMs = 5000, fetchFn = fetch } = config;
  const headers: Record<string, string> = { 'User-Agent': 'planes-above.com (+https://planes-above.com)' };
  if (apiKey) headers['x-api-key'] = apiKey;
  return {
    name: 'adsb.lol',
    async getPlanesNear(lat, lon, radiusNm) {
      const radius = Math.ceil(Math.min(radiusNm, 250));
      const url = `${baseUrl}/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`;
      let res: Response;
      try {
        res = await fetchFn(url, {
          signal: AbortSignal.timeout(timeoutMs),
          headers
        });
      } catch (err) {
        const reason = err instanceof Error && err.name === 'TimeoutError' ? 'request timed out' : 'network error';
        throw new ProviderError(`adsb.lol: ${reason}`, null, { cause: err });
      }
      if (!res.ok) throw new ProviderError(`adsb.lol HTTP ${res.status}`, res.status);
      const body: unknown = await res.json();
      const { aircraft, nowMs } = unwrapAdsbLol(body);
      return aircraft.map((ac) => toPlane(ac, nowMs)).filter((p): p is Plane => p !== null);
    },
  };
}