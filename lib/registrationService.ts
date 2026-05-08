import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RegistrationPayload } from './validators';
import type { RegistrationResult } from './types';
import { validateSaleWithSteren } from './sterenClient';
import { registerParticipationLocal, shouldUseLocalRegistrationStore } from './localRegistrationStore';

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

function padEntryNumber(value: number, digits: number): string {
  return value.toString().padStart(digits, '0');
}

function generateFolio(raffleQuarter: string, entryNumber: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${raffleQuarter}-${entryNumber}-${rand}`;
}

export async function registerParticipation(
  input: RegistrationPayload,
  ctx: Ctx
): Promise<RegistrationResult> {
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
    if (!existingUser.email) patch.email = input.email;
    if (!existingUser.full_name) patch.full_name = input.full_name;
    if (!existingUser.birthdate) patch.birthdate = input.birthdate;
    if (Object.keys(patch).length > 0) {
      await sb.from('users').update(patch).eq('id', userId);
    }
  } else {
    const { data: created, error: userErr } = await sb
      .from('users')
      .insert({
        full_name: input.full_name,
        phone: input.phone,
        email: input.email,
        birthdate: input.birthdate,
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

  // Get next entry number from DB function (atomic)
  const { data: nextVal, error: seqErr } = await sb.rpc('get_next_entry_number', {
    p_raffle_id: raffle.id,
  });

  if (seqErr || nextVal == null) {
    await audit(sb, 'entry_sequence_error', 'sales', saleRow.id, { err: seqErr?.message }, ctx);
    return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
  }

  const entryNumber = padEntryNumber(Number(nextVal), raffle.winning_digits_count ?? 5);
  const internalFolio = generateFolio(raffle.quarter, entryNumber);

  const { data: entry, error: entryErr } = await sb
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

  if (entryErr || !entry) {
    await audit(sb, 'entry_insert_failed', 'sales', saleRow.id, { err: entryErr?.message }, ctx);
    return { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' };
  }

  await audit(
    sb,
    'registration_success',
    'entries',
    entry.id,
    { entry_number: entryNumber, raffle_id: raffle.id },
    ctx,
    'user',
    userId
  );

  // Fire email async (do not block on failure)
  void sendConfirmationEmail(sb, {
    userId,
    entryId: entry.id,
    email: input.email,
    full_name: input.full_name,
    entry_number: entryNumber,
    internal_folio: internalFolio,
    raffle_name: raffle.name,
    created_at: entry.created_at as string,
  });

  return {
    ok: true,
    entry_number: entryNumber,
    internal_folio: internalFolio,
    full_name: input.full_name,
    email: input.email,
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
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    await sb.from('email_delivery_log').insert({
      user_id: params.userId,
      entry_id: params.entryId,
      email: params.email,
      template_name: 'raffle_confirmation',
      delivery_status: 'pending',
      provider_response: { note: 'RESEND_API_KEY not configured; queued' },
    });
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Rifa <no-reply@rifa.local>',
        to: params.email,
        subject: `Tu boleto virtual - ${params.raffle_name}`,
        html: renderEmailHtml(params),
      }),
    });
    const body = await res.json().catch(() => ({}));
    await sb.from('email_delivery_log').insert({
      user_id: params.userId,
      entry_id: params.entryId,
      email: params.email,
      template_name: 'raffle_confirmation',
      delivery_status: res.ok ? 'sent' : 'failed',
      provider_response: body,
      sent_at: res.ok ? new Date().toISOString() : null,
    });
  } catch (err: any) {
    await sb.from('email_delivery_log').insert({
      user_id: params.userId,
      entry_id: params.entryId,
      email: params.email,
      template_name: 'raffle_confirmation',
      delivery_status: 'failed',
      provider_response: { error: String(err?.message ?? err) },
    });
  }
}

function renderEmailHtml(p: {
  full_name: string;
  entry_number: string;
  internal_folio: string;
  raffle_name: string;
  created_at: string;
}) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#F4F6F8;padding:24px;color:#4A4A4A">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#003A5D;color:#fff;padding:24px">
      <div style="font-size:14px;opacity:.8">Tu boleto virtual</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(p.raffle_name)}</div>
    </div>
    <div style="padding:24px">
      <p>Hola <strong>${escapeHtml(p.full_name)}</strong>,</p>
      <p>Gracias por participar. Aqui esta tu boleto virtual:</p>
      <div style="border:2px dashed #00A3E0;border-radius:12px;padding:20px;text-align:center;margin:16px 0">
        <div style="font-size:12px;color:#6b7280;letter-spacing:2px">NUMERO DE PARTICIPACION</div>
        <div style="font-size:40px;font-weight:800;color:#003A5D;letter-spacing:6px;margin-top:6px">${escapeHtml(p.entry_number)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:12px">Folio: ${escapeHtml(p.internal_folio)}</div>
      </div>
      <p style="font-size:14px">Conserva este correo como comprobante. El sorteo se realizara con base en los resultados oficiales de Loteria Nacional.</p>
    </div>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

function hashPhone(p: string) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) | 0;
  return `h${h}`;
}
