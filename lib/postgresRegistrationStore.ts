import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import type { RegistrationPayload } from './validators';
import type { RegistrationResult } from './types';
import { validateSaleWithSteren } from './sterenClient';
import { generateEntryNumber, generateFolio } from './randomEntry';

type LocalLookupResult =
  | {
      ok: true;
      entry_number: string;
      internal_folio: string;
      status: string;
      created_at: string;
      raffle_name: string;
      draw_date: string | null;
    }
  | {
      ok: false;
      message: string;
    };

const DEFAULT_RAFFLE = {
  id: 'active-raffle-q2-2026',
  name: 'Rifa Trimestral Q2 2026 - Aguascalientes',
  quarter: 'Q2-2026',
  winning_digits_count: 5,
  draw_reference_date: null as string | null,
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function shouldUsePostgresRegistrationStore() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) schemaReady = initializeSchema();
  return schemaReady;
}

async function initializeSchema() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      birthdate DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      sale_identifier TEXT NOT NULL UNIQUE,
      sale_type TEXT NOT NULL CHECK (sale_type IN ('ticket', 'factura')),
      validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'invalid')),
      steren_internal_identifier TEXT,
      branch TEXT,
      sale_date DATE,
      total_amount NUMERIC(12, 2),
      raw_api_response JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      raffle_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      sale_id TEXT NOT NULL UNIQUE REFERENCES sales(id),
      entry_number TEXT NOT NULL UNIQUE,
      internal_folio TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'winner')),
      accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
      accepted_privacy BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS entries_created_at_idx ON entries(created_at DESC);
    CREATE INDEX IF NOT EXISTS entries_user_id_idx ON entries(user_id);
    CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales(created_at DESC);
  `);
}

function hasCompleteProfile(input: RegistrationPayload) {
  return Boolean(input.full_name && input.email && input.birthdate);
}

async function queryOne<T extends QueryResultRow>(client: PoolClient, sql: string, params: unknown[] = []) {
  const result = await client.query<T>(sql, params);
  return result.rows[0] ?? null;
}

export async function lookupPostgresCustomerExists(phone: string) {
  await ensureSchema();
  const result = await getPool().query('SELECT id FROM users WHERE phone = $1 LIMIT 1', [phone]);
  return { ok: true, exists: (result.rowCount ?? 0) > 0 };
}

export async function registerParticipationPostgres(
  input: RegistrationPayload
): Promise<RegistrationResult> {
  await ensureSchema();

  const saleIdentifier = input.sale_identifier.trim().toUpperCase();

  const validation = await validateSaleWithSteren(saleIdentifier, input.sale_type);
  if ('kind' in validation) {
    return {
      ok: false,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'Intenta nuevamente más tarde.',
    };
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const existingSale = await queryOne<{ id: string }>(
      client,
      'SELECT id FROM sales WHERE UPPER(sale_identifier) = $1 LIMIT 1',
      [saleIdentifier]
    );
    if (existingSale) {
      await client.query('ROLLBACK');
      return { ok: false, error_code: 'DUPLICATE_SALE', message: 'Esta venta ya fue registrada.' };
    }

    if (!validation.valid) {
      await client.query(
        `INSERT INTO sales (
          id, sale_identifier, sale_type, validation_status, raw_api_response
        ) VALUES ($1, $2, $3, 'invalid', $4)
        ON CONFLICT (sale_identifier) DO NOTHING`,
        [randomUUID(), saleIdentifier, input.sale_type, JSON.stringify(validation.raw)]
      );
      await client.query('COMMIT');
      return { ok: false, error_code: 'INVALID_SALE', message: 'No se pudo validar la compra.' };
    }

    let user = await queryOne<{
      id: string;
      full_name: string;
      email: string;
      birthdate: string;
    }>(client, 'SELECT id, full_name, email, birthdate FROM users WHERE phone = $1 LIMIT 1', [input.phone]);

    if (user) {
      const fullName = user.full_name || input.full_name || '';
      const email = user.email || input.email || '';
      const birthdate = user.birthdate || input.birthdate || '';
      await client.query(
        `UPDATE users
         SET full_name = $2, email = $3, birthdate = $4, updated_at = NOW()
         WHERE id = $1`,
        [user.id, fullName, email, birthdate]
      );
      user = { ...user, full_name: fullName, email, birthdate };
    } else {
      if (!hasCompleteProfile(input)) {
        await client.query('ROLLBACK');
        return { ok: false, error_code: 'VALIDATION_ERROR', message: 'Completa tus datos para registrarte.' };
      }

      user = await queryOne(
        client,
        `INSERT INTO users (id, full_name, phone, email, birthdate)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, email, birthdate`,
        [randomUUID(), input.full_name!, input.phone, input.email!, input.birthdate!]
      );

      if (!user) {
        await client.query('ROLLBACK');
        return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
      }
    }

    const sale = await queryOne<{ id: string }>(
      client,
      `INSERT INTO sales (
        id, sale_identifier, sale_type, validation_status, steren_internal_identifier,
        branch, sale_date, total_amount, raw_api_response
      ) VALUES ($1, $2, $3, 'valid', $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        randomUUID(),
        saleIdentifier,
        input.sale_type,
        validation.steren_internal_identifier,
        validation.branch,
        validation.sale_date,
        validation.total_amount,
        JSON.stringify(validation.raw),
      ]
    );

    if (!sale) {
      await client.query('ROLLBACK');
      return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
    }

    const entry = await insertRandomEntry(client, user.id, sale.id);
    await client.query('COMMIT');

    return {
      ok: true,
      entry_number: entry.entry_number,
      internal_folio: entry.internal_folio,
      full_name: user.full_name,
      email: user.email,
      raffle_name: DEFAULT_RAFFLE.name,
      created_at: toIsoString(entry.created_at),
    };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') {
      return { ok: false, error_code: 'DUPLICATE_SALE', message: 'Esta venta ya fue registrada.' };
    }
    return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
  } finally {
    client.release();
  }
}

async function insertRandomEntry(client: PoolClient, userId: string, saleId: string) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const entryNumber = generateEntryNumber(DEFAULT_RAFFLE.winning_digits_count);
    const internalFolio = generateFolio(DEFAULT_RAFFLE.quarter, entryNumber);
    const entry = await queryOne<{
      id: string;
      entry_number: string;
      internal_folio: string;
      created_at: string;
    }>(
      client,
      `INSERT INTO entries (
        id, raffle_id, user_id, sale_id, entry_number, internal_folio,
        accepted_terms, accepted_privacy
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
      ON CONFLICT (entry_number) DO NOTHING
      RETURNING id, entry_number, internal_folio, created_at`,
      [randomUUID(), DEFAULT_RAFFLE.id, userId, saleId, entryNumber, internalFolio]
    );
    if (entry) return entry;
  }

  throw new Error('No fue posible generar un número de participación único.');
}

export async function lookupPostgresParticipation(folio: string): Promise<LocalLookupResult> {
  await ensureSchema();
  const result = await getPool().query<{
    entry_number: string;
    internal_folio: string;
    status: string;
    created_at: Date | string;
  }>('SELECT entry_number, internal_folio, status, created_at FROM entries WHERE UPPER(internal_folio) = $1 LIMIT 1', [
    folio.trim().toUpperCase(),
  ]);
  const row = result.rows[0];

  if (!row) {
    return { ok: false, message: 'No se encontró la participación.' };
  }

  return {
    ok: true,
    entry_number: row.entry_number,
    internal_folio: row.internal_folio,
    status: row.status,
    created_at: toIsoString(row.created_at),
    raffle_name: DEFAULT_RAFFLE.name,
    draw_date: DEFAULT_RAFFLE.draw_reference_date,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export async function getPostgresAdminStats() {
  await ensureSchema();
  const db = getPool();
  const [users, entries, validSales, recent] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS count FROM users'),
    db.query('SELECT COUNT(*)::int AS count FROM entries'),
    db.query("SELECT COUNT(*)::int AS count FROM sales WHERE validation_status = 'valid'"),
    db.query(`
      SELECT
        e.id,
        e.entry_number,
        e.internal_folio,
        e.status,
        e.created_at,
        u.full_name,
        u.phone,
        u.email,
        u.birthdate,
        s.sale_identifier,
        s.sale_type,
        s.branch,
        s.sale_date,
        s.total_amount
      FROM entries e
      JOIN users u ON u.id = e.user_id
      JOIN sales s ON s.id = e.sale_id
      ORDER BY e.created_at DESC
      LIMIT 50
    `),
  ]);

  return {
    stats: {
      users: users.rows[0]?.count ?? 0,
      entries: entries.rows[0]?.count ?? 0,
      valid_sales: validSales.rows[0]?.count ?? 0,
      duplicates: 0,
      emails: {
        sent: 0,
        failed: 0,
        pending: 0,
      },
    },
    recent_entries: recent.rows,
  };
}
