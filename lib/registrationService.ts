import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RegistrationPayload } from './validators';
import type { RegistrationResult } from './types';
import { validateSaleWithSteren } from './sterenClient';
import { registerParticipationLocal, shouldUseLocalRegistrationStore } from './localRegistrationStore';
import { registerParticipationPostgres, shouldUsePostgresRegistrationStore } from './postgresRegistrationStore';
import { generateEntryNumber, generateFolio } from './randomEntry';
import { sendRaffleConfirmationEmail } from './emailService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function serverClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Ctx = { ip: string | null; user_agent: string | null };

async function audit(
  sb: SupabaseClient,
  event: string,
  entity_type: string | null,
  entity_id: string | null,
  metadata: Record<string, unknown>,
  ctx: Ctx,
  actor_type: 'anonymous' | 'user' | 'admin' | 'system' = 'anonymous',
  actor_id: string | null = null
) {
  try {
    await sb.from('audit_log').insert({
      actor_type,
      actor_id,
      event_type: event,
      entity_type,
      entity_id,
      metadata,
      ip: ctx.ip,
      user_agent: ctx.user_agent,
    });
  } catch {
    // never break flow on audit failure
  }
}

function hasCompleteProfile(input: RegistrationPayload) {
  return Boolean(input.full_name && input.email && input.birthdate);
}

export async function registerParticipation(
  input: RegistrationPayload,
  ctx: Ctx
): Promise<RegistrationResult> {
  if (shouldUsePostgresRegistrationStore()) {
    return registerParticipationPostgres(input);
  }

  if (shouldUseLocalRegistrationStore()) {
    return registerParticipationLocal(input);
  }

  const sb = serverClient();

  const { data: raffle, error: raffleErr } = await sb
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (raffleErr || !raffle) {
    await audit(sb, 'registration_no_active_raffle', null, null, { input_sale: input.sale_identifier }, ctx);
    return { ok: false, error_code: 'NO_ACTIVE_RAFFLE', message: 'No hay una rifa activa en este momento.' };
  }

  // Duplicate sale pre-check (fast path)
  const { data: existingSale } = await sb
    .from('sales')
    .select('id, sale_identifier')
    .eq('sale_identifier', input.sale_identifier)
    .maybeSingle();

  if (existingSale) {
    await audit(
      sb,
      'registration_duplicate_sale',
      'sales',
      existingSale.id,
      { sale_identifier: input.sale_identifier },
      ctx
    );
    return { ok: false, error_code: 'DUPLICATE_SALE', message: 'Esta venta ya fue registrada.' };
  }

  // Upsert user by phone
  let userId: string;
  const { data: existingUser } = await sb
    .from('users')
    .select('id, email, full_name, birthdate')
    .eq('phone', input.phone)
    .maybeSingle();

  if (existingUser) {
    userId = existingUser.id;
    const patch: Record<string, string> = {};
    if (!existingUser.email && input.email) patch.email = input.email;
    if (!existingUser.full_name && input.full_name) patch.full_name = input.full_name;
    if (!existingUser.birthdate && input.birthdate) patch.birthdate = input.birthdate;
    if (Object.keys(patch).length > 0) {
      await sb.from('users').update(patch).eq('id', userId);
    }
  } else {
    if (!hasCompleteProfile(input)) {
      return { ok: false, error_code: 'VALIDATION_ERROR', message: 'Completa tus datos para registrarte.' };
    }

    const { data: created, error: userErr } = await sb
      .from('users')
      .insert({
        full_name: input.full_name!,
        phone: input.phone,
        email: input.email!,
        birthdate: input.birthdate!,
      })
      .select('id')
      .maybeSingle();

    if (userErr || !created) {
      // Race: another request inserted same phone
      const { data: retry } = await sb
        .from('users')
        .select('id')
        .eq('phone', input.phone)
        .maybeSingle();
      if (!retry) {
        await audit(sb, 'registration_user_insert_failed', null, null, { phone_hash: hashPhone(input.phone) }, ctx);
        return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
      }
      userId = retry.id;
    } else {
      userId = created.id;
    }
  }

  // Log terms acceptance
  await sb.from('terms_acceptance_log').insert({
    user_id: userId,
    raffle_id: raffle.id,
    terms_version: raffle.terms_version,
    privacy_version: raffle.privacy_version,
    ip: ctx.ip,
    user_agent: ctx.user_agent,
  });

  // Validate sale with Steren (backend only)
  const validation = await validateSaleWithSteren(input.sale_identifier, input.sale_type);

  if ('kind' in validation) {
    await audit(
      sb,
      'steren_integration_error',
      'sales',
      null,
      { kind: validation.kind, sale_identifier: input.sale_identifier },
      ctx
    );
    return {
      ok: false,
      error_code: 'SERVICE_UNAVAILABLE',
      message: 'Intenta nuevamente mas tarde.',
    };
  }

  if (!validation.valid) {
    await sb.from('sales').insert({
      sale_identifier: input.sale_identifier,
      sale_type: input.sale_type,
      raw_api_response: validation.raw as object,
      validation_status: 'invalid',
      validated_at: new Date().toISOString(),
    });
    await audit(sb, 'sale_invalid', 'sales', null, { sale_identifier: input.sale_identifier, reason: validation.reason }, ctx);
    return { ok: false, error_code: 'INVALID_SALE', message: 'No se pudo validar la compra.' };
  }

  // Insert sale (unique constraint on sale_identifier is the final guard)
  const { data: saleRow, error: saleErr } = await sb
    .from('sales')
    .insert({
      sale_identifier: input.sale_identifier,
      sale_type: input.sale_type,
      steren_internal_identifier: validation.steren_internal_identifier,
      branch: validation.branch,
      sale_date: validation.sale_date,
      total_amount: validation.total_amount,
      raw_api_response: validation.raw as object,
      validation_status: 'valid',
      validated_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (saleErr || !saleRow) {
    // 23505 unique violation means concurrent duplicate
    const code = (saleErr as any)?.code;
    if (code === '23505') {
      await audit(sb, 'registration_duplicate_sale_concurrent', 'sales', null, { sale_identifier: input.sale_identifier }, ctx);
      return { ok: false, error_code: 'DUPLICATE_SALE', message: 'Esta venta ya fue registrada.' };
    }
    await audit(sb, 'sale_insert_failed', null, null, { code, sale_identifier: input.sale_identifier }, ctx);
    return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
  }

  const fullName = existingUser?.full_name ?? input.full_name ?? '';
  const email = existingUser?.email ?? input.email ?? '';

  let entry:
    | {
        id: string;
        entry_number: string;
        internal_folio: string;
        created_at: string;
      }
    | null = null;
  let entryErr: any = null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const entryNumber = generateEntryNumber(raffle.winning_digits_count ?? 5);
    const internalFolio = generateFolio(raffle.quarter, entryNumber);
    const result = await sb
      .from('entries')
      .insert({
        raffle_id: raffle.id,
        user_id: userId,
        sale_id: saleRow.id,
        entry_number: entryNumber,
        internal_folio: internalFolio,
        status: 'active',
      })
      .select('id, entry_number, internal_folio, created_at')
      .maybeSingle();

    if (!result.error && result.data) {
      entry = result.data;
      break;
    }

    entryErr = result.error;
    if ((result.error as any)?.code !== '23505') break;
  }

  if (entryErr || !entry) {
    await audit(sb, 'entry_insert_failed', 'sales', saleRow.id, { err: entryErr?.message }, ctx);
    return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
  }

  await audit(
    sb,
    'registration_success',
    'entries',
    entry.id,
    { entry_number: entry.entry_number, raffle_id: raffle.id },
    ctx,
    'user',
    userId
  );

  // Fire email async (do not block on failure)
  void sendConfirmationEmail(sb, {
    userId,
    entryId: entry.id,
    email,
    full_name: fullName,
    entry_number: entry.entry_number,
    internal_folio: entry.internal_folio,
    raffle_name: raffle.name,
    created_at: entry.created_at as string,
  });

  return {
    ok: true,
    entry_number: entry.entry_number,
    internal_folio: entry.internal_folio,
    full_name: fullName,
    email,
    raffle_name: raffle.name,
    created_at: entry.created_at as string,
  };
}

async function sendConfirmationEmail(
  sb: SupabaseClient,
  params: {
    userId: string;
    entryId: string;
    email: string;
    full_name: string;
    entry_number: string;
    internal_folio: string;
    raffle_name: string;
    created_at: string;
  }
) {
  const delivery = await sendRaffleConfirmationEmail({
    email: params.email,
    full_name: params.full_name,
    entry_number: params.entry_number,
    internal_folio: params.internal_folio,
    raffle_name: params.raffle_name,
    created_at: params.created_at,
  });

  await sb.from('email_delivery_log').insert({
    user_id: params.userId,
    entry_id: params.entryId,
    email: params.email,
    template_name: 'raffle_confirmation',
    delivery_status: delivery.status,
    provider_response: delivery.providerResponse,
    sent_at: delivery.sentAt,
  });
}

function hashPhone(p: string) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) | 0;
  return `h${h}`;
}
