import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAirline } from './resolve.js';
import type { Airline } from './types.js';

const AIR_FRANCE: Airline = { icao: 'AFR', name: 'Air France', telephony: 'AIRFRANS', country: 'France' };
const EASYJET: Airline = { icao: 'EZY', name: 'easyJet', telephony: 'EASY', country: 'United Kingdom' };

const airlines = new Map<string, Airline>([
  ['AFR', AIR_FRANCE],
  ['EZY', EASYJET],
]);

test('resolves an airline callsign padded with spaces', () => {
  assert.deepEqual(resolveAirline('AFR1234  ', airlines), AIR_FRANCE);
});

test('resolves a callsign with a letter suffix after the flight number', () => {
  assert.deepEqual(resolveAirline('EZY12AB', airlines), EASYJET);
});

test('resolves a lowercase callsign', () => {
  assert.deepEqual(resolveAirline('afr1234', airlines), AIR_FRANCE);
});

test('returns null for a registration-style callsign with no digits after the prefix', () => {
  assert.equal(resolveAirline('FGKXA', airlines), null);
});

test('returns null for a US registration (N-number)', () => {
  assert.equal(resolveAirline('N123AB', airlines), null);
});

test('returns null for an empty or whitespace-only callsign', () => {
  assert.equal(resolveAirline('', airlines), null);
  assert.equal(resolveAirline('   ', airlines), null);
});

test('returns null when there is no callsign', () => {
  assert.equal(resolveAirline(null, airlines), null);
  assert.equal(resolveAirline(undefined, airlines), null);
});

test('returns the code with null fields for an unknown airline prefix', () => {
  assert.deepEqual(resolveAirline('ZZZ123', airlines), {
    icao: 'ZZZ',
    name: null,
    telephony: null,
    country: null,
  });
});

test('returns null when an airline map is empty but the callsign is not airline-shaped', () => {
  assert.equal(resolveAirline('FGKXA', new Map()), null);
});

test('returns the code with null fields when the airline map is empty (DB unavailable)', () => {
  assert.deepEqual(resolveAirline('AFR1234', new Map()), {
    icao: 'AFR',
    name: null,
    telephony: null,
    country: null,
  });
});