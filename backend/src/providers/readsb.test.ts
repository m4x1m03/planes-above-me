import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toPlane, type ReadsbAircraft } from './readsb.js';
import type { Plane } from '../types/planes.js';

// Real adsb.lol response captured from AWS CloudShell (Paris, 10 nm)
const fixture = JSON.parse(
  readFileSync(new URL('./__fixtures__/adsblol-paris.json', import.meta.url), 'utf8'),
) as { now: number; ac: ReadsbAircraft[] };

const NOW_MS = fixture.now; // 1792526297500

function byHex(hex: string): ReadsbAircraft {
  const ac = fixture.ac.find((a) => a.hex === hex);
  if (!ac) throw new Error(`fixture is missing aircraft ${hex}`);
  return ac;
}

// Maps an aircraft and fails the test if it was rejected
function mapped(ac: ReadsbAircraft): Plane {
  const plane = toPlane(ac, NOW_MS);
  assert.ok(plane, `expected ${ac.hex} to be mapped, got null`);
  return plane;
}

// Float comparison, same tolerance as Jest/Vitest toBeCloseTo
function assertClose(actual: number | null, expected: number, digits = 2) {
  assert.ok(typeof actual === 'number', `expected a number, got ${actual}`);
  assert.ok(
    Math.abs(actual - expected) < 10 ** -digits / 2,
    `expected ${actual} to be close to ${expected}`,
  );
}

// Copy of an aircraft with some fields removed (simulates fields the API omitted)
type OptionalKey = Exclude<keyof ReadsbAircraft, 'hex'>;
function without(ac: ReadsbAircraft, ...keys: OptionalKey[]): ReadsbAircraft {
  const copy: ReadsbAircraft = { ...ac };
  for (const key of keys) delete copy[key];
  return copy;
}

const AIRBORNE = byHex('398568'); // AFR7394
const GROUND = byHex('3964f4'); // F-GZHU at Orly, most fields missing

// --- Airborne aircraft (AFR7394) ---

test('airborne: keeps identity fields', () => {
  const plane = mapped(AIRBORNE);
  assert.equal(plane.icao24, '398568');
  assert.equal(plane.callsign, 'AFR7394'); // trailing space trimmed
  assert.equal(plane.squawk, '1000');
  assert.equal(plane.on_ground, false);
});

test('airborne: keeps position and heading', () => {
  const plane = mapped(AIRBORNE);
  assert.equal(plane.lat, 48.794083);
  assert.equal(plane.lon, 2.187477);
  assertClose(plane.heading, 188.86);
});

test('airborne: converts feet to metres', () => {
  const plane = mapped(AIRBORNE);
  assertClose(plane.baro_altitude, 5143.5); // 16875 ft
  assertClose(plane.geo_altitude, 5189.22); // 17025 ft
});

test('airborne: converts knots to m/s', () => {
  assertClose(mapped(AIRBORNE).velocity, 160.352); // 311.7 kt
});

test('airborne: converts ft/min to m/s', () => {
  assertClose(mapped(AIRBORNE).vertical_rate, 15.606); // 3072 ft/min
});

test('airborne: uses API time, in seconds', () => {
  const plane = mapped(AIRBORNE);
  assertClose(plane.timestamp, 1792526297.5, 3);
  assertClose(plane.time_position, 1792526297.5, 3); // seen_pos 0
});

// --- Ground aircraft with missing fields (F-GZHU) ---

test('ground: flags it as on the ground', () => {
  assert.equal(mapped(GROUND).on_ground, true);
});

test('ground: uses null, never undefined or NaN, for missing fields', () => {
  const plane = mapped(GROUND);
  assert.equal(plane.callsign, null);
  assert.equal(plane.baro_altitude, null);
  assert.equal(plane.geo_altitude, null);
  assert.equal(plane.vertical_rate, null);
  assert.equal(plane.squawk, null);
});

test('ground: still converts what it has', () => {
  const plane = mapped(GROUND);
  assertClose(plane.velocity, 3.1896, 3); // 6.2 kt
  assertClose(plane.heading, 19.69);
});

test('ground: dates the position using seen_pos', () => {
  assertClose(mapped(GROUND).time_position, 1792526269.322, 3); // 28.178 s old
});

// --- Rejections and edge cases ---

test('rejects positions older than 60 s', () => {
  assert.equal(toPlane({ ...AIRBORNE, seen_pos: 90 }, NOW_MS), null);
});

test('accepts a position exactly 60 s old', () => {
  mapped({ ...AIRBORNE, seen_pos: 60 });
});

test('rejects aircraft without a position', () => {
  assert.equal(toPlane(without(AIRBORNE, 'lat'), NOW_MS), null);
  assert.equal(toPlane(without(AIRBORNE, 'lon'), NOW_MS), null);
});

test('rejects aircraft without ground speed', () => {
  assert.equal(toPlane(without(AIRBORNE, 'gs'), NOW_MS), null);
});

test('does not treat zero as missing', () => {
  // regression: `!value` would reject all of these
  const plane = mapped({ ...AIRBORNE, lon: 0, gs: 0, seen_pos: 0 });
  assert.equal(plane.lon, 0);
  assert.equal(plane.velocity, 0);
});

test('falls back to geom_rate when baro_rate is missing', () => {
  assertClose(mapped({ ...without(AIRBORNE, 'baro_rate'), geom_rate: 600 }).vertical_rate, 3.048, 3);
});

test('falls back to true_heading when track is missing', () => {
  assertClose(mapped(without(AIRBORNE, 'track')).heading, 192.05);
});

test('turns a blank callsign into null', () => {
  assert.equal(mapped({ ...AIRBORNE, flight: '        ' }).callsign, null);
});

test('lowercases the hex and keeps the ~ prefix', () => {
  assert.equal(mapped({ ...AIRBORNE, hex: '~3C7439' }).icao24, '~3c7439');
});

// --- Whole fixture ---

test('maps every aircraft in the snapshot with plausible values', () => {
  for (const ac of fixture.ac) {
    const plane = mapped(ac);
    if (plane.baro_altitude !== null) assert.ok(plane.baro_altitude < 15_000, `${ac.hex}: altitude ${plane.baro_altitude} m, feet not converted?`);
    if (plane.velocity !== null) assert.ok(plane.velocity < 350, `${ac.hex}: velocity ${plane.velocity} m/s, knots not converted?`);
    for (const [key, value] of Object.entries(plane)) {
      assert.ok(!Number.isNaN(value), `${ac.hex}: ${key} is NaN`);
    }
  }
});