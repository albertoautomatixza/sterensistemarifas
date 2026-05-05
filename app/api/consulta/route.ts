import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = rateLimit(`consulta:ip:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
      { status: 429 }
    );
  }

  const folio = req.nextUrl.searchParams.get('folio')?.trim();
  if (!folio || !/^[A-Z0-9\-]{4,40}$/i.test(folio)) {
    return NextResponse.json(
      { ok: false, message: 'Folio inválido.' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { ok: false, message: 'No se encontró la participación.' },
      { status: 404 }
    );
  }

  const { data: raffle } = await sb
    .from('raffles')
    .select('name, quarter, draw_reference_date')
    .eq('id', data.raffle_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    entry_number: data.entry_number,
    internal_folio: data.internal_folio,
    status: data.status,
    created_at: data.created_at,
    raffle_name: raffle?.name ?? null,
    draw_date: raffle?.draw_reference_date ?? null,
  });
}
