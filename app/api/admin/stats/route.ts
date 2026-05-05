import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return true; // dev mode without admin gate
  const header = req.headers.get('x-admin-token');
  return header === token;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, message: 'No autorizado.' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const [users, entries, validSales, duplicates, emails] = await Promise.all([
    sb.from('users').select('id', { count: 'exact', head: true }),
    sb.from('entries').select('id', { count: 'exact', head: true }),
    sb.from('sales').select('id', { count: 'exact', head: true }).eq('validation_status', 'valid'),
    sb.from('audit_log').select('id', { count: 'exact', head: true }).in('event_type', ['registration_duplicate_sale', 'registration_duplicate_sale_concurrent']),
    sb.from('email_delivery_log').select('delivery_status'),
  ]);

  const emailCounts = (emails.data ?? []).reduce(
    (acc: Record<string, number>, e: any) => {
      acc[e.delivery_status] = (acc[e.delivery_status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const { data: recent } = await sb
    .from('entries')
    .select('id, entry_number, internal_folio, status, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    ok: true,
    stats: {
      users: users.count ?? 0,
      entries: entries.count ?? 0,
      valid_sales: validSales.count ?? 0,
      duplicates: duplicates.count ?? 0,
      emails: {
        sent: emailCounts.sent ?? 0,
        failed: emailCounts.failed ?? 0,
        pending: emailCounts.pending ?? 0,
      },
    },
    recent_entries: recent ?? [],
  });
}
