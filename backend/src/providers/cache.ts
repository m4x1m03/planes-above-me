/* Pull based call, users are grouped together in cells and share one api call for that cell point
  instead of having distinct calls per users. No data is called to api until a user is present.
  If new request comes in after an api call in the cell but before the next one, use the cached data */
import type { Plane } from '../types/planes.js';
import { ProviderError, type PlaneProvider } from './types.js';

interface PlaneCacheConfig {
  provider: PlaneProvider;
  cellDeg?: number;        // default 0.5
  radiusNm?: number;       // default 120 (covers the frontend box from any point in a cell)
  ttlMs?: number;          // default 8_000
  staleGraceMs?: number;   // default 60_000 (how old data can be and still be served on error)
  cooldownMs?: number;     // default 30_000 (pause after a 429)
  now?: () => number;      // default Date.now, swapped in tests
}

interface Entry { planes: Plane[]; fetchedAt: number }

export function createPlaneCache(config: PlaneCacheConfig) {
  // destructure defaults here, like in the provider
  const { provider, cellDeg = 0.5, radiusNm = 120, ttlMs = 8_000, staleGraceMs = 60_000, cooldownMs = 30_000, now = Date.now } = config;
  const entries = new Map<string, Entry>();
  const inflight = new Map<string, Promise<Plane[]>>();
  let cooldownUntil = 0;

  function staleFor(key: string): Plane[] | null {
    // look up the entry; return its planes if it's younger than staleGraceMs, otherwise null
    const entry = entries.get(key);
    if(entry && now() - entry.fetchedAt < staleGraceMs) return entry.planes;
    return null;
  }

  return {
    async getPlanesAround(lat: number, lon: number): Promise<Plane[]> {
      const cellLat = Math.floor(lat / cellDeg) * cellDeg + cellDeg / 2;
      const cellLon = Math.floor(lon / cellDeg) * cellDeg + cellDeg / 2;
      const key=`${cellLat},${cellLon}`;
      const entry = entries.get(key);
      if (entry && now() - entry.fetchedAt < ttlMs) return entry.planes;
      const flying = inflight.get(key);
      if(flying) return flying;
      if (now() < cooldownUntil) {
        const stale = staleFor(key);
        if (stale) return stale;
        throw new ProviderError(`${provider.name}: rate limited, cooling down`, 429);
      }
      const promise = (async () => {
        try {
          const planes = await provider.getPlanesNear(cellLat, cellLon, radiusNm);
          entries.set(key, {planes, fetchedAt: now()});
          for (const [k, e] of entries){
            if(now()-e.fetchedAt >= staleGraceMs) entries.delete(k);
          }
          return planes;
        } catch (err) {
          if (err instanceof ProviderError && err.status === 429) {
            cooldownUntil = now() + cooldownMs;
          }
          const stale = staleFor(key);
          if (stale) return stale;
          throw err;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, promise);
      return promise;
    },
  };
}
export type PlaneCache = ReturnType<typeof createPlaneCache>;