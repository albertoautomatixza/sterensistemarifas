import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rateLimit';
import { lookupLocalParticipation, shouldUseLocalRegistrationStore } from '@/lib/localRegistrationStore';
import { clientIp, hashForRateLimit, secureJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`consulta:ip:${hashForRateLimit(ip)}`, { limit: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return secureJson(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: limit.retryAfterMs }
    );
  }

  const folio = req.nextUrl.searchParams.get('folio')?.trim();
  if (!folio || !/^[A-Z0-9\-]{4,40}$/i.test(folio)) {
    return secureJson(
      { ok: false, message: 'Folio inválido.' },
      { status: 400 }
    );
  }

  const folioLimit = rateLimit(`consulta:folio:${hashForRateLimit(folio.toUpperCase())}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!folioLimit.ok) {
    return secureJson(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: folioLimit.retryAfterMs }
    );
  }

  if (shouldUseLocalRegistrationStore()) {
    const result = await lookupLocalParticipation(folio);
    return secureJson(result, { status: result.ok ? 200 : 404 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb
    .from('entries')
    .select('entry_number, internal_folio, status, created_at, raffle_id')
    .eq('internal_folio', folio)
    .maybeSingle();

  if (error || !data) {
    return secureJson(
      { ok: false, message: 'No se encontró la participación.' },
      { status: 404 }
    );
  }

  const { data: raffle } = await sb
    .from('raffles')
    .select('name, quarter, draw_reference_date')
    .eq('id', data.raffle_id)
    .maybeSingle();

  return secureJson({
    ok: true,
    entry_number: data.entry_number,
    internal_folio: data.internal_folio,
    status: data.status,
    created_at: data.created_at,
    raffle_name: raffle?.name ?? null,
    draw_date: raffle?.draw_reference_date ?? null,
  });
}
