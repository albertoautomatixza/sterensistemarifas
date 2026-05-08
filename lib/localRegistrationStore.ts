import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { RegistrationPayload } from './validators';
import type { RegistrationResult } from './types';
import { validateSaleWithSteren } from './sterenClient';

type LocalUser = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  birthdate: string;
  created_at: string;
  updated_at: string;
};

type LocalSale = {
  id: string;
  sale_identifier: string;
  sale_type: 'ticket' | 'factura';
  validation_status: 'valid' | 'invalid';
  steren_internal_identifier: string | null;
  branch: string | null;
  sale_date: string | null;
  total_amount: number | null;
  raw_api_response: unknown;
  created_at: string;
};

type LocalEntry = {
  id: string;
  raffle_id: string;
  user_id: string;
  sale_id: string;
  entry_number: string;
  internal_folio: string;
  status: 'active' | 'cancelled' | 'winner';
  created_at: string;
};

type LocalDb = {
  sequence: number;
  raffle: {
    id: string;
    name: string;
    quarter: string;
    winning_digits_count: number;
    draw_reference_date: string | null;
  };
  users: LocalUser[];
  sales: LocalSale[];
  entries: LocalEntry[];
};

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
  id: 'local-active-raffle',
  name: 'Rifa Trimestral Q2 2026 - Aguascalientes',
  quarter: 'Q2-2026',
  winning_digits_count: 5,
  draw_reference_date: null,
};

export function shouldUseLocalRegistrationStore() {
  if (process.env.LOCAL_REGISTRATION_STORE === 'true') return true;
  if (process.env.LOCAL_REGISTRATION_STORE === 'false') return false;
  return !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function dbPath() {
  return (
    process.env.LOCAL_REGISTRATION_DB_PATH ??
    path.join(process.cwd(), '.local-data', 'registrations.json')
  );
}

async function readDb(): Promise<LocalDb> {
  try {
    const raw = await readFile(dbPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      sequence: parsed.sequence ?? 0,
      raffle: { ...DEFAULT_RAFFLE, ...parsed.raffle },
      users: parsed.users ?? [],
      sales: parsed.sales ?? [],
      entries: parsed.entries ?? [],
    };
  } catch {
    return {
      sequence: 0,
      raffle: DEFAULT_RAFFLE,
      users: [],
      sales: [],
      entries: [],
    };
  }
}

async function writeDb(db: LocalDb) {
  const file = dbPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db, null, 2), 'utf8');
}

function padEntryNumber(value: number, digits: number) {
  return value.toString().padStart(digits, '0');
}

function generateFolio(quarter: string, entryNumber: string) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${quarter}-${entryNumber}-${rand}`;
}

export async function registerParticipationLocal(
  input: RegistrationPayload
): Promise<RegistrationResult> {
  const db = await readDb();
  const now = new Date().toISOString();
  const saleIdentifier = input.sale_identifier.trim().toUpperCase();

  const existingSale = db.sales.find(
    (sale) => sale.sale_identifier.toUpperCase() === saleIdentifier
  );
  if (existingSale) {
    return { ok: false, error_code: 'DUPLICATE_SALE', message: 'Esta venta ya fue registrada.' };
  }

  const validation = await validateSaleWithSteren(saleIdentifier, input.sale_type);
  if ('kind' in validation) {
    return {
      ok: false,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'Intenta nuevamente más tarde.',
    };
  }

  if (!validation.valid) {
    db.sales.push({
      id: randomUUID(),
      sale_identifier: saleIdentifier,
      sale_type: input.sale_type,
      validation_status: 'invalid',
      steren_internal_identifier: null,
      branch: null,
      sale_date: null,
      total_amount: null,
      raw_api_response: validation.raw,
      created_at: now,
    });
    await writeDb(db);
    return { ok: false, error_code: 'INVALID_SALE', message: 'No se pudo validar la compra.' };
  }

  let user = db.users.find((item) => item.phone === input.phone);
  if (user) {
    user = {
      ...user,
      full_name: user.full_name || input.full_name,
      email: user.email || input.email,
      birthdate: user.birthdate || input.birthdate,
      updated_at: now,
    };
    db.users = db.users.map((item) => (item.id === user!.id ? user! : item));
  } else {
    user = {
      id: randomUUID(),
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      birthdate: input.birthdate,
      created_at: now,
      updated_at: now,
    };
    db.users.push(user);
  }

  const sale: LocalSale = {
    id: randomUUID(),
    sale_identifier: saleIdentifier,
    sale_type: input.sale_type,
    validation_status: 'valid',
    steren_internal_identifier: validation.steren_internal_identifier,
    branch: validation.branch,
    sale_date: validation.sale_date,
    total_amount: validation.total_amount,
    raw_api_response: validation.raw,
    created_at: now,
  };
  db.sales.push(sale);

  db.sequence += 1;
  const entryNumber = padEntryNumber(db.sequence, db.raffle.winning_digits_count);
  const internalFolio = generateFolio(db.raffle.quarter, entryNumber);
  const entry: LocalEntry = {
    id: randomUUID(),
    raffle_id: db.raffle.id,
    user_id: user.id,
    sale_id: sale.id,
    entry_number: entryNumber,
    internal_folio: internalFolio,
    status: 'active',
    created_at: now,
  };
  db.entries.push(entry);

  await writeDb(db);

  return {
    ok: true,
    entry_number: entryNumber,
    internal_folio: internalFolio,
    full_name: user.full_name,
    email: user.email,
    raffle_name: db.raffle.name,
    created_at: entry.created_at,
  };
}

export async function lookupLocalParticipation(folio: string): Promise<LocalLookupResult> {
  const db = await readDb();
  const entry = db.entries.find(
    (item) => item.internal_folio.toUpperCase() === folio.trim().toUpperCase()
  );

  if (!entry) {
    return { ok: false, message: 'No se encontró la participación.' };
  }

  return {
    ok: true,
    entry_number: entry.entry_number,
    internal_folio: entry.internal_folio,
    status: entry.status,
    created_at: entry.created_at,
    raffle_name: db.raffle.name,
    draw_date: db.raffle.draw_reference_date,
  };
}
