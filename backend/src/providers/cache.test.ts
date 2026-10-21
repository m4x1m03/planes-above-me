import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlaneCache } from './cache.js';
import { ProviderError, type PlaneProvider } from './types.js';
import type { Plane } from '../types/planes.js';

// Minimal valid plane, only icao24 matters for these tests
function plane(icao24: string): Plane {
  return {
    icao24,
    callsign: null,
    lat: 48.8,
    lon: 2.3,
    heading: 90,
    velocity: 200,
    vertical_rate: 0,
    baro_altitude: 10_000,
    geo_altitude: 10_000,
    on_ground: false,
    time_position: 0,
    timestamp: 0,
    squawk: null,
  };
}

const FRESH = [plane('aaa111')];
const NEWER = [plane('bbb222')];

// Fake provider + fake clock. `respond` decides what the next upstream call returns.
function setup() {
  let time = 1_000_000;
  const calls: Array<[number, number, number]> = [];
  let respond: () => Promise<Plane[]> = async () => FRESH;

  const provider: PlaneProvider = {
    name: 'fake',
    getPlanesNear: async (lat, lon, radiusNm) => {
      calls.push([lat, lon, radiusNm]);
      return respond();
    },
  };
  const cache = createPlaneCache({ provider, now: () => time });

  return {
    cache,
    calls,
    advance: (ms: number) => { time += ms; },
    setResponse: (fn: () => Promise<Plane[]>) => { respond = fn; },
  };
}

const failWith = (status: number | null) => async (): Promise<never> => {
  throw new ProviderError(`fake HTTP ${status}`, status);
};

async function assertProviderError(promise: Promise<unknown>, status: number | null) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof ProviderError, `expected a ProviderError, got ${String(err)}`);
    assert.equal(err.status, status);
    return true;
  });
}

// --- Cells ---

test('queries the cell centre, not the user position, with the default radius', async () => {
  const { cache, calls } = setup();
  await cache.getPlanesAround(48.86, 2.35); // Paris
  assert.deepEqual(calls, [[48.75, 2.25, 120]]);
});

test('users in the same cell share one upstream call', async () => {
  const { cache, calls } = setup();
  await cache.getPlanesAround(48.86, 2.35); // Paris
  await cache.getPlanesAround(48.93, 2.36); // Saint-Denis
  await cache.getPlanesAround(48.80, 2.13); // Versailles
  assert.equal(calls.length, 1);
});

test('users in different cells get separate calls', async () => {
  const { cache, calls } = setup();
  await cache.getPlanesAround(48.86, 2.35); // Paris
  await cache.getPlanesAround(45.76, 4.84); // Lyon
  assert.deepEqual(calls, [
    [48.75, 2.25, 120],
    [45.75, 4.75, 120],
  ]);
});

test('snaps negative coordinates to the right cell', async () => {
  const { cache, calls } = setup();
  await cache.getPlanesAround(-33.87, 151.21); // Sydney
  await cache.getPlanesAround(40.64, -73.78); // JFK
  assert.deepEqual(calls, [
    [-33.75, 151.25, 120],
    [40.75, -73.75, 120],
  ]);
});

// --- Freshness ---

test('serves cached data until the TTL runs out, then refetches', async () => {
  const { cache, calls, advance, setResponse } = setup();
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH);

  setResponse(async () => NEWER);
  advance(7_999);
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH);
  assert.equal(calls.length, 1);

  advance(1);
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), NEWER);
  assert.equal(calls.length, 2);
});

// --- Coalescing ---

test('concurrent requests for one cell wait for a single upstream call', async () => {
  const { cache, calls, setResponse } = setup();

  let release: (planes: Plane[]) => void = () => {};
  setResponse(() => new Promise<Plane[]>((resolve) => { release = resolve; }));

  const requests = [
    cache.getPlanesAround(48.86, 2.35),
    cache.getPlanesAround(48.93, 2.36),
    cache.getPlanesAround(48.80, 2.13),
  ];
  await Promise.resolve(); // let the fake provider start
  assert.equal(calls.length, 1);

  release(FRESH);
  for (const planes of await Promise.all(requests)) assert.deepEqual(planes, FRESH);
});

test('concurrent requests all get the stale fallback when the shared call fails', async () => {
  const { cache, advance, setResponse } = setup();
  await cache.getPlanesAround(48.86, 2.35); // cache FRESH
  advance(10_000); // expired, still within the grace period

  let fail: (err: unknown) => void = () => {};
  setResponse(() => new Promise<Plane[]>((_, reject) => { fail = reject; }));

  const requests = [cache.getPlanesAround(48.86, 2.35), cache.getPlanesAround(48.93, 2.36)];
  await Promise.resolve();
  fail(new ProviderError('fake HTTP 500', 500));

  for (const planes of await Promise.all(requests)) assert.deepEqual(planes, FRESH);
});

// --- Failures ---

test('throws when upstream fails and there is no cached data', async () => {
  const { cache, setResponse } = setup();
  setResponse(failWith(500));
  await assertProviderError(cache.getPlanesAround(48.86, 2.35), 500);
});

test('retries after a failure instead of remembering the error', async () => {
  const { cache, calls, setResponse } = setup();
  setResponse(failWith(500));
  await assertProviderError(cache.getPlanesAround(48.86, 2.35), 500);

  setResponse(async () => FRESH);
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH);
  assert.equal(calls.length, 2);
});

test('serves stale data when upstream fails within the grace period', async () => {
  const { cache, advance, setResponse } = setup();
  await cache.getPlanesAround(48.86, 2.35);

  advance(30_000);
  setResponse(failWith(500));
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH);
});

test('stops serving stale data once it is older than the grace period', async () => {
  const { cache, advance, setResponse } = setup();
  await cache.getPlanesAround(48.86, 2.35);

  advance(60_000);
  setResponse(failWith(500));
  await assertProviderError(cache.getPlanesAround(48.86, 2.35), 500);
});

// --- Rate limiting ---

test('a 429 pauses all upstream calls for the cooldown, in every cell', async () => {
  const { cache, calls, advance, setResponse } = setup();
  setResponse(failWith(429));
  await assertProviderError(cache.getPlanesAround(48.86, 2.35), 429);

  setResponse(async () => FRESH);
  advance(10_000);
  await assertProviderError(cache.getPlanesAround(48.86, 2.35), 429); // same cell
  await assertProviderError(cache.getPlanesAround(45.76, 4.84), 429); // other cell
  assert.equal(calls.length, 1);

  advance(20_000); // 30 s after the 429
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH);
  assert.equal(calls.length, 2);
});

test('serves stale data during the cooldown without calling upstream', async () => {
  const { cache, calls, advance, setResponse } = setup();
  await cache.getPlanesAround(48.86, 2.35); // cache FRESH

  advance(10_000);
  setResponse(failWith(429));
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH); // 429 → stale

  advance(5_000);
  assert.deepEqual(await cache.getPlanesAround(48.86, 2.35), FRESH); // cooling down → stale
  assert.equal(calls.length, 2);
});