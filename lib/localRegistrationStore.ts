import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { RegistrationPayload } from './validators';
import type { RegistrationResult } from './types';
import { validateSaleWithSteren } from './sterenClient';
import { generateEntryNumber, generateFolio } from './randomEntry';

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

type LocalCustomerLookupResult = {
  ok: true;
  exists: boolean;
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

function hasCompleteProfile(input: RegistrationPayload) {
  return Boolean(input.full_name && input.email && input.birthdate);
}

function getUnusedEntryNumber(db: LocalDb) {
  const used = new Set(db.entries.map((entry) => entry.entry_number));
  for (let attempt = 0; attempt < 500; attempt++) {
    const entryNumber = generateEntryNumber(db.raffle.winning_digits_count);
    if (!used.has(entryNumber)) return entryNumber;
  }
  throw new Error('No fue posible generar un número de participación único.');
}

export async function lookupLocalCustomerByPhone(phone: string): Promise<LocalCustomerLookupResult> {
  const db = await readDb();
  return {
    ok: true,
    exists: db.users.some((item) => item.phone === phone),
  };
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
    console.error('steren_validation_unavailable', {
      kind: validation.kind,
      status: 'status' in validation ? validation.status : undefined,
      message: 'message' in validation ? validation.message : undefined,
      sale_type: input.sale_type,
      sale_identifier_length: saleIdentifier.length,
    });
    return {
      ok: false,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'No fue posible conectar con Steren en este momento. Intenta nuevamente en unos minutos.',
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
    if (!hasCompleteProfile(input)) {
      return { ok: false, error_code: 'VALIDATION_ERROR', message: 'Completa tus datos para registrarte.' };
    }

    user = {
      id: randomUUID(),
      full_name: input.full_name!,
      phone: input.phone,
      email: input.email!,
      birthdate: input.birthdate!,
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

  const entryNumber = getUnusedEntryNumber(db);
  db.sequence += 1;
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

export async function getLocalAdminStats() {
  const db = await readDb();
  const recentEntries = [...db.entries]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50)
    .map((entry) => {
      const user = db.users.find((item) => item.id === entry.user_id);
      const sale = db.sales.find((item) => item.id === entry.sale_id);

      return {
        id: entry.id,
        entry_number: entry.entry_number,
        internal_folio: entry.internal_folio,
        status: entry.status,
        created_at: entry.created_at,
        full_name: user?.full_name ?? null,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
        birthdate: user?.birthdate ?? null,
        sale_identifier: sale?.sale_identifier ?? null,
        sale_type: sale?.sale_type ?? null,
        branch: sale?.branch ?? null,
        sale_date: sale?.sale_date ?? null,
        total_amount: sale?.total_amount ?? null,
      };
    });

  return {
    stats: {
      users: db.users.length,
      entries: db.entries.length,
      valid_sales: db.sales.filter((sale) => sale.validation_status === 'valid').length,
      duplicates: 0,
      emails: {
        sent: 0,
        failed: 0,
        pending: 0,
      },
    },
    recent_entries: recentEntries,
  };
}
