import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import type { FastifyInstance } from 'fastify';

type AirlineRow = {
  id: number;
  name: string | null;
  icao: string | null;
  telephony: string | null;
  country: string | null;
  active: boolean;
};

const UPSERT_AIRLINES_SQL = 'INSERT INTO airlines (icao, name, telephony, country) SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) ON CONFLICT (icao) DO UPDATE SET name = EXCLUDED.name, telephony = EXCLUDED.telephony, country = EXCLUDED.country;' 

const clean = (v: string | undefined): string | null =>
  v === undefined || v === '' || v === '\\N' ? null : v;

type ValidAirline = AirlineRow & { icao: string; name: string };

const isValid = (a: AirlineRow): a is ValidAirline =>
  a.icao !== null && /^[A-Z]{3}$/.test(a.icao) && a.name !== null;

const beats = (candidate: ValidAirline, current: ValidAirline): boolean => {
  if (candidate.active !== current.active) return candidate.active;
  return candidate.id > current.id;
};

export async function seedAirlines(app: FastifyInstance) {
  const text = await readFile('data/airlines.dat', 'utf8');
  const rows: string[][] = parse(text, {
    columns: false,
    relax_quotes: true,
    relax_column_count: true,
    trim:true
  });


  const parsed: AirlineRow[] = rows.map((r) => ({
    id: Number(r[0]),
    name: clean(r[1]),
    icao: clean(r[4])?.toUpperCase() ?? null,
    telephony: clean(r[5]),
    country: clean(r[6]),
    active: r[7] === 'Y',
  }));

  const valid = parsed.filter(isValid);

  const byIcao = new Map<string, ValidAirline>();
  for (const airline of valid) {
    const existing = byIcao.get(airline.icao);
    if (!existing || beats(airline, existing)) {
      byIcao.set(airline.icao, airline);
    }
  }

  const airlines = [...byIcao.values()];
  const names = airlines.map((a) => a.name);
  const icaos = airlines.map((a) => a.icao);
  const telephonies = airlines.map((a) => a.telephony);
  const countries = airlines.map((a) => a.country);
  
  const result = await app.db.query(UPSERT_AIRLINES_SQL, [icaos, names, telephonies, countries]);
  
  app.log.info(
  {
    parsed: parsed.length,
    valid: valid.length,
    unique: byIcao.size,
    sample: byIcao.get('AFR'),
    upserted: result.rowCount,
  },
  'airlines parsed',
  );
}