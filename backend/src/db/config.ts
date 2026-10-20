import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

export function buildPoolConfig(): PoolConfig {
  const useSsl = process.env.PGSSL === 'true';
  return {
    max: 5,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30_000,
    ssl: useSsl
      ? { ca: readFileSync(process.env.PGSSLCA_PATH ?? '/app/certs/rds-ca.pem', 'utf8') }
      : false,
  };
}