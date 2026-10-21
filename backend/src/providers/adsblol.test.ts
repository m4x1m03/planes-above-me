import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAdsbLolProvider, unwrapAdsbLol } from './adsblol.js';
import { ProviderError } from './types.js';

// Real adsb.lol response captured from AWS CloudShell (Paris, 10 nm)
const fixtureText = readFileSync(new URL('./__fixtures__/adsblol-paris.json', import.meta.url), 'utf8');
const fixture: unknown = JSON.parse(fixtureText);

const BASE_URL = 'https://api.adsb.lol';

// Fake fetch: records the URLs it was called with and returns whatever `respond` gives
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: string[] = [];
  const fn: typeof fetch = async (input) => {
    calls.push(String(input));
    return respond();
  };
  return { fn, calls };
}

// Checks that a promise rejects with a ProviderError carrying the given status
async function assertProviderError(promise: Promise<unknown>, status: number | null) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof ProviderError, `expected a ProviderError, got ${String(err)}`);
    assert.equal(err.status, status);
    return true;
  });
}

// --- unwrapAdsbLol ---

test('unwrap: reads aircraft and time from the real fixture', () => {
  const { aircraft, nowMs } = unwrapAdsbLol(fixture);
  assert.equal(aircraft.length, 5);
  assert.equal(nowMs, 1792526297500);
});

test('unwrap: rejects a response that is not an object', () => {
  assert.throws(() => unwrapAdsbLol(null), ProviderError);
  assert.throws(() => unwrapAdsbLol('oops'), ProviderError);
  assert.throws(() => unwrapAdsbLol([]), ProviderError);
});

test('unwrap: rejects a missing or invalid "now"', () => {
  assert.throws(() => unwrapAdsbLol({ ac: [] }), ProviderError);
  assert.throws(() => unwrapAdsbLol({ now: '1792526297500', ac: [] }), ProviderError);
});

test('unwrap: rejects a missing or invalid "ac"', () => {
  assert.throws(() => unwrapAdsbLol({ now: 1 }), ProviderError);
  assert.throws(() => unwrapAdsbLol({ now: 1, ac: {} }), ProviderError);
});

test('unwrap: accepts an empty sky', () => {
  assert.deepEqual(unwrapAdsbLol({ now: 1, ac: [] }), { aircraft: [], nowMs: 1 });
});

test('unwrap: drops malformed entries instead of crashing', () => {
  const { aircraft } = unwrapAdsbLol({
    now: 1,
    ac: [{ hex: 'abc123' }, { lat: 48.8 }, { hex: 42 }, null, 'nope'],
  });
  assert.deepEqual(aircraft, [{ hex: 'abc123' }]);
});

// --- getPlanesNear ---

test('provider: returns mapped planes from a successful response', async () => {
  const { fn } = fakeFetch(() => new Response(fixtureText, { status: 200 }));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  const planes = await provider.getPlanesNear(48.86, 2.35, 10);

  assert.equal(planes.length, 5);
  assert.ok(planes.some((p) => p.callsign === 'AFR7394'));
  assert.ok(planes.every((p) => p !== null));
});

test('provider: builds the point URL with rounded coordinates', async () => {
  const { fn, calls } = fakeFetch(() => new Response(fixtureText));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await provider.getPlanesNear(48.856613, 2.352222, 30);

  assert.deepEqual(calls, ['https://api.adsb.lol/v2/point/48.8566/2.3522/30']);
});

test('provider: clamps the radius to 250 nm and rounds it up', async () => {
  const { fn, calls } = fakeFetch(() => new Response(fixtureText));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await provider.getPlanesNear(48.86, 2.35, 400);
  await provider.getPlanesNear(48.86, 2.35, 119.2);

  assert.equal(calls[0], 'https://api.adsb.lol/v2/point/48.8600/2.3500/250');
  assert.equal(calls[1], 'https://api.adsb.lol/v2/point/48.8600/2.3500/120');
});

test('provider: throws a ProviderError with status 429 when rate limited', async () => {
  const { fn } = fakeFetch(() => new Response('slow down', { status: 429 }));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await assertProviderError(provider.getPlanesNear(48.86, 2.35, 10), 429);
});

test('provider: throws a ProviderError with status 500 on a server error', async () => {
  const { fn } = fakeFetch(() => new Response('boom', { status: 500 }));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await assertProviderError(provider.getPlanesNear(48.86, 2.35, 10), 500);
});

test('provider: turns a timeout into a ProviderError', async () => {
  const { fn } = fakeFetch(() => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  });
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await assertProviderError(provider.getPlanesNear(48.86, 2.35, 10), null);
});

test('provider: throws a ProviderError when the JSON shape is wrong', async () => {
  const { fn } = fakeFetch(() => new Response(JSON.stringify({ hello: 'world' })));
  const provider = createAdsbLolProvider({ baseUrl: BASE_URL, fetchFn: fn });

  await assertProviderError(provider.getPlanesNear(48.86, 2.35, 10), null);
});